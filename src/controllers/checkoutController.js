const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { Reservation, TicketType, EventPaymentPlan } = require("../models");

/**
 * Crear sesión de Checkout para Apartado Inicial (Invitado)
 */
exports.createInitialCheckoutSession = async (req, res) => {
  try {
    const {
      eventId,
      ticketTypeId,
      quantity,
      customerName,
      customerEmail,
      customerPhone,
    } = req.body;

    // 1. Obtener boleto y reglas de apartado
    const ticketType = await TicketType.findByPk(ticketTypeId);
    if (!ticketType) {
      return res
        .status(404)
        .json({ success: false, message: "Tipo de boleto no válido" });
    }

    const paymentPlan = await EventPaymentPlan.findOne({ where: { eventId } });
    const unitPrice = parseFloat(ticketType.price);
    const totalAmount = unitPrice * (quantity || 1);

    // Si hay plan de pagos, se cobra el apartado por unidad, si no, la totalidad
    const depositPerTicket = paymentPlan
      ? parseFloat(paymentPlan.initialDeposit)
      : unitPrice;
    const initialPaymentAmount = depositPerTicket * (quantity || 1);

    // 2. Crear Checkout Session en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: `Apartado: ${ticketType.name}`,
              description: `Pago inicial para ${quantity || 1} boleto(s). Total a liquidar: $${totalAmount} MXN`,
            },
            unit_amount: Math.round(initialPaymentAmount * 100), // En centavos
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "INITIAL_RESERVATION",
        eventId: String(eventId),
        ticketTypeId: String(ticketTypeId),
        quantity: String(quantity || 1),
        customerName,
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone || "",
        totalAmount: String(totalAmount),
        initialPaymentAmount: String(initialPaymentAmount),
      },
      success_url: `${process.env.FRONTEND_URL}/reserva-exitosa?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancelado`,
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Error al crear sesión de checkout:", error);
    return res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud de pago",
    });
  }
};

/**
 * Crear sesión de Checkout para Abonos posteriores
 */
exports.createInstallmentCheckoutSession = async (req, res) => {
  try {
    const { reservationCode, amountToPay } = req.body;

    const reservation = await Reservation.findOne({
      where: { reservationCode },
    });
    if (!reservation) {
      return res
        .status(404)
        .json({ success: false, message: "Reservación no encontrada" });
    }

    const amount = parseFloat(amountToPay);
    const pending = parseFloat(reservation.balancePending);

    if (amount <= 0 || amount > pending) {
      return res.status(400).json({
        success: false,
        message: `El monto ingresado es inválido. Saldo pendiente: $${pending} MXN`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: reservation.customerEmail,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: `Abono a Reservación ${reservation.reservationCode}`,
              description: `Abono parcial. Saldo pendiente actual: $${pending} MXN`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "INSTALLMENT_PAYMENT",
        reservationId: String(reservation.id),
        reservationCode: reservation.reservationCode,
        amountPaid: String(amount),
      },
      success_url: `${process.env.FRONTEND_URL}/mi-cuenta?email=${encodeURIComponent(reservation.customerEmail)}`,
      cancel_url: `${process.env.FRONTEND_URL}/mi-cuenta`,
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Error al crear pago de abono:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al procesar el abonado" });
  }
};
