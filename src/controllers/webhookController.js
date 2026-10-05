const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  Reservation,
  Transaction,
  Order,
  Ticket,
  sequelize,
} = require("../models");
const crypto = require("crypto");

/**
 * Escuchar eventos webhook de Stripe
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(`⚠️ Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata;

    if (metadata.type === "INITIAL_RESERVATION") {
      await processInitialReservation(session, metadata);
    } else if (metadata.type === "INSTALLMENT_PAYMENT") {
      await processInstallmentPayment(session, metadata);
    }
  }

  return res.status(200).json({ received: true });
};

/**
 * Lógica para registrar nueva reservación y primer abono
 */
async function processInitialReservation(session, metadata) {
  const transaction = await sequelize.transaction();
  try {
    const totalAmount = parseFloat(metadata.totalAmount);
    const initialPaid = parseFloat(metadata.initialPaymentAmount);
    const balancePending = totalAmount - initialPaid;
    const reservationCode = `RES-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Crear Reservación
    const reservation = await Reservation.create(
      {
        eventId: parseInt(metadata.eventId),
        ticketTypeId: parseInt(metadata.ticketTypeId),
        reservationCode,
        customerName: metadata.customerName,
        customerEmail: metadata.customerEmail,
        customerPhone: metadata.customerPhone,
        quantity: parseInt(metadata.quantity),
        totalAmount,
        totalPaid: initialPaid,
        balancePending,
        status: balancePending === 0 ? "completed" : "active",
        stripeCustomerId: session.customer || null,
      },
      { transaction },
    );

    // 2. Registrar Transacción
    await Transaction.create(
      {
        reservationId: reservation.id,
        amount: initialPaid,
        paymentMethod: "stripe",
        stripePaymentIntentId: session.payment_intent,
        status: "succeeded",
      },
      { transaction },
    );

    // 3. Si se pagó por completo desde el inicio, liquidar e idear boletos
    if (balancePending === 0) {
      await finalizeOrderAndTickets(reservation, transaction);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("Error al procesar webhook de reservación inicial:", error);
  }
}

/**
 * Lógica para registrar abonos a reservaciones existentes
 */
async function processInstallmentPayment(session, metadata) {
  const transaction = await sequelize.transaction();
  try {
    const reservation = await Reservation.findByPk(metadata.reservationId, {
      transaction,
    });
    if (!reservation) return;

    const amountPaid = parseFloat(metadata.amountPaid);
    const newTotalPaid = parseFloat(reservation.totalPaid) + amountPaid;
    const newBalancePending =
      parseFloat(reservation.totalAmount) - newTotalPaid;

    // 1. Actualizar saldos en la reservación
    reservation.totalPaid = newTotalPaid;
    reservation.balancePending = newBalancePending <= 0 ? 0 : newBalancePending;
    if (newBalancePending <= 0) {
      reservation.status = "completed";
    }
    await reservation.save({ transaction });

    // 2. Registrar Transacción
    await Transaction.create(
      {
        reservationId: reservation.id,
        amount: amountPaid,
        paymentMethod: "stripe",
        stripePaymentIntentId: session.payment_intent,
        status: "succeeded",
      },
      { transaction },
    );

    // 3. Si se completó el saldo, liquidar e idear boletos
    if (newBalancePending <= 0) {
      await finalizeOrderAndTickets(reservation, transaction);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("Error al procesar webhook de abono:", error);
  }
}

/**
 * Genera la Orden y los Boletos con QR cuando la reservación se liquida (balancePending === 0)
 */
async function finalizeOrderAndTickets(reservation, transaction) {
  const orderCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

  const order = await Order.create(
    {
      reservationId: reservation.id,
      eventId: reservation.eventId,
      orderCode,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      totalAmount: reservation.totalAmount,
      status: "paid",
    },
    { transaction },
  );

  // Crear n boletos físicos/digitales según la cantidad
  const ticketsToCreate = [];
  for (let i = 0; i < reservation.quantity; i++) {
    const qrCode = crypto.randomBytes(16).toString("hex");
    ticketsToCreate.push({
      orderId: order.id,
      reservationId: reservation.id,
      ticketTypeId: reservation.ticketTypeId,
      qrCode,
      status: "valid",
    });
  }

  await Ticket.bulkCreate(ticketsToCreate, { transaction });
}
