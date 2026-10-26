const { Order, Ticket, Payment, sequelize } = require("../models");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_PAYMENTS; // Llave whsec_... de tu webhook en Stripe

  let event;

  try {
    // 1. Verificar la firma oficial de Stripe (Nota: req.body debe ser el buffer crudo si usas express.raw)
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`⚠️ Error de firma en Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Manejar el evento de pago exitoso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Extraer los metadatos que enviamos al crear la orden
    const { orderId, eventId, paymentType } = session.metadata || {};

    if (!orderId) {
      console.error("❌ Webhook recibido sin orderId en los metadatos.");
      return res
        .status(400)
        .json({ received: false, message: "Missing orderId" });
    }

    const transaction = await sequelize.transaction();

    try {
      // Buscar la orden en la BD
      const order = await Order.findByPk(orderId, { transaction });
      if (!order) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ received: false, message: "Order not found" });
      }

      // Evitar procesar dos veces la misma orden si Stripe reintenta el webhook
      if (order.status === "completed" && paymentType === "FULL") {
        await transaction.rollback();
        return res
          .status(200)
          .json({ received: true, message: "Order already processed" });
      }

      // 3. LÓGICA SEGÚN EL TIPO DE PAGO (FULL vs PLAN)
      if (paymentType === "FULL") {
        // --- CASO A: PAGO DE CONTADO ---
        order.status = "completed";
        order.stripePaymentIntentId = session.payment_intent;
        order.balancePending = 0;
        await order.save({ transaction });

        // Activar los tickets reservados
        await Ticket.update(
          { status: "reserved" },
          { where: { orderId: order.id }, transaction },
        );

        // Registrar el pago completo en la tabla de Pagos (si la manejas)
        await Payment.create(
          {
            orderId: order.id,
            amount: order.totalPaid,
            paymentMethod: "stripe",
            stripePaymentIntentId: session.id,
            status: "succeeded",
          },
          { transaction },
        );
      } else if (paymentType === "PLAN") {
        // --- CASO B: ABONO / PLAN DE PAGOS ---
        const amountPaidNow = parseFloat(session.amount_total) / 100; // Stripe maneja centavos

        // Registrar el abono en la tabla de pagos
        await Payment.create(
          {
            orderId: order.id,
            amount: amountPaidNow,
            paymentMethod: "stripe",
            stripeSessionId: session.id,
            status: "succeeded",
          },
          { transaction },
        );

        // Actualizar saldos y estatus de la orden
        const newBalancePending = Math.max(
          0,
          parseFloat(order.balancePending) - amountPaidNow,
        );

        order.balancePending = newBalancePending;
        // Si el saldo pendiente llega a 0, la orden se marca como PAID, de lo contrario sigue PARTIAL o ACTIVE con deuda
        order.status = newBalancePending === 0 ? "completed" : "active_plan";
        await order.save({ transaction });

        // Activar los tickets con el primer abono (enganche cubierto)
        await Ticket.update(
          { status: "reserved" },
          { where: { orderId: order.id }, transaction },
        );
      }

      // Confirmar todos los cambios en la Base de Datos
      await transaction.commit();
      console.log(
        `✅ Orden ${order.orderNumber} procesada correctamente vía Webhook.`,
      );
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
