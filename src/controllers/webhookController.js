const {
  Order,
  Ticket,
  Payment,
  Event,
  TicketType,
  sequelize,
} = require("../models");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { sendTicketsEmail } = require("../services/emailService");
const { Op } = require("sequelize");
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_PAYMENTS;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`⚠️ Error de firma en Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { orderId, paymentType } = session.metadata || {};

    if (!orderId) {
      console.error("❌ Webhook recibido sin orderId en los metadatos.");
      return res
        .status(400)
        .json({ received: false, message: "Missing orderId" });
    }

    // --- IDEMPOTENCIA NIVEL EVENTO DE STRIPE (Opcional pero recomendado) ---
    // Si guardas los eventos procesados en una tabla auxiliar, puedes frenar aquí antes de abrir transacción.

    const transaction = await sequelize.transaction();

    try {
      // 1. Validar si este session.id o payment_intent ya fue registrado en Payments
      const existingPayment = await Payment.findOne({
        where: {
          stripePaymentIntentId: session.payment_intent,
        },
        transaction, // ¡Importante incluir la transacción aquí!
      });

      if (existingPayment) {
        console.log(
          "⚠️ El pago ya había sido registrado anteriormente. Ignorando webhook duplicado.",
        );
        await transaction.rollback(); // <-- EVITA LA FUGA DE CONEXIÓN
        return res.status(200).json({
          received: true,
          message: "Pago ya registrado anteriormente",
        });
      }

      // Buscar la orden incluyendo modelos necesarios
      const order = await Order.findByPk(orderId, {
        include: [
          { model: Event, as: "event" },
          { model: TicketType, as: "ticketType" },
          { model: Ticket, as: "tickets" },
        ],
        transaction,
      });

      if (!order) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ received: false, message: "Order not found" });
      }

      // Evitar doble procesamiento si la orden ya está completa y llega un reintento FULL
      if (order.status === "completed" && paymentType === "FULL") {
        await transaction.rollback();
        return res
          .status(200)
          .json({ received: true, message: "Order already processed" });
      }

      let shouldSendEmail = false;

      // -------------------------------------------------------------
      // CASO A: PAGO DE CONTADO (FULL)
      // -------------------------------------------------------------
      if (paymentType === "FULL") {
        order.status = "completed";
        order.stripePaymentIntentId = session.payment_intent;
        order.totalPaid = order.totalAmount;
        order.balancePending = 0;
        await order.save({ transaction });

        await Ticket.update(
          { status: "reserved" },
          { where: { orderId: order.id }, transaction },
        );

        await Payment.create(
          {
            orderId: order.id,
            amount: order.totalAmount,
            paymentMethod: "stripe",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            status: "succeeded",
          },
          { transaction },
        );

        shouldSendEmail = true;
      }
      // -------------------------------------------------------------
      // CASO B: PRIMER PAGO / ENGANCHE DE PLAN DE PAGOS (PLAN)
      // -------------------------------------------------------------
      else if (paymentType === "PLAN") {
        const amountPaidNow = parseFloat(session.amount_total) / 100;

        await Payment.create(
          {
            orderId: order.id,
            amount: amountPaidNow,
            paymentMethod: "stripe",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            status: "succeeded",
          },
          { transaction },
        );

        const newTotalPaid = parseFloat(order.totalPaid || 0) + amountPaidNow;
        const newBalancePending = Math.max(
          0,
          parseFloat(order.totalAmount) - newTotalPaid,
        );
        const isFullyPaid = newBalancePending <= 0;

        order.totalPaid = newTotalPaid;
        order.balancePending = newBalancePending;
        order.status = isFullyPaid ? "completed" : "active_plan";
        await order.save({ transaction });

        await Ticket.update(
          { status: "reserved" },
          { where: { orderId: order.id }, transaction },
        );

        if (isFullyPaid) {
          shouldSendEmail = true;
        }
      }
      // -------------------------------------------------------------
      // CASO C: ABONO SUBSECUENTE A ORDEN EXISTENTE (INSTALLMENT_PAYMENT)
      // -------------------------------------------------------------
      else if (paymentType === "INSTALLMENT_PAYMENT") {
        const amountPaidInOrder = parseFloat(session.amount_total) / 100;

        await Payment.create(
          {
            orderId: order.id,
            amount: amountPaidInOrder,
            paymentMethod: "stripe",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            status: "succeeded",
          },
          { transaction },
        );

        const newTotalPaid =
          parseFloat(order.totalPaid || 0) + amountPaidInOrder;

        const newBalancePending = Math.max(
          0,
          parseFloat(order.totalAmount) - newTotalPaid,
        );
        const isFullyPaid = newBalancePending <= 0;

        order.totalPaid = newTotalPaid;
        order.balancePending = newBalancePending;
        order.status = isFullyPaid ? "completed" : "active_plan";
        await order.save({ transaction });

        if (isFullyPaid) {
          shouldSendEmail = true;
        }
      }

      // Confirmar transacción en BD
      await transaction.commit();
      console.log(`✅ Orden ${order.id} procesada correctamente vía Webhook.`);

      // 4. DISPARAR ENVÍO DE CORREO (Fuera de la transacción y tras el commit)
      if (shouldSendEmail) {
        const tickets = await Ticket.findAll({ where: { orderId: order.id } });

        sendTicketsEmail(order, tickets)
          .then(() =>
            console.log(
              `📧 Correo de boletos enviado a ${order.customerEmail}`,
            ),
          )
          .catch((err) =>
            console.error(`❌ Error al enviar correo via Resend:`, err),
          );
      }

      return res.status(200).json({ received: true });
    } catch (dbError) {
      await transaction.rollback();
      console.error(
        "❌ Error al procesar la orden en la BD desde el Webhook:",
        dbError,
      );
      return res.status(500).json({ received: false, error: dbError.message });
    }
  }

  res.status(200).json({ received: true });
};

module.exports = { handleStripeWebhook };
