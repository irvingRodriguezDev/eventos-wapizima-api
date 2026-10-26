const {
  Order,
  Ticket,
  TicketType,
  Event,
  Coupon,
  Payment,
  sequelize,
} = require("../models");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Asegúrate de tener tu instancia de Stripe

exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      eventId,
      ticketTypeId,
      quantity = 1,
      paymentType = "FULL", // 'FULL' o 'PLAN'
      couponId = null, // Opcional
      customerDetails, // { email, name, picture, email_verified, username }
      selectedSeats = [], // Opcional para eventos con mapa
    } = req.body;

    // 1. Validar existencia del Evento
    const event = await Event.findByPk(eventId, { transaction });
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "El evento seleccionado no existe.",
      });
    }

    // 2. Validar Tipo de Boleto y Stock (¡Obtenemos el precio real de la BD!)
    const ticketType = await TicketType.findByPk(ticketTypeId, { transaction });
    if (!ticketType) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "El tipo de boleto seleccionado no existe.",
      });
    }

    const requestedQuantity =
      selectedSeats.length > 0 ? selectedSeats.length : parseInt(quantity, 10);
    if (ticketType.availableQuantity < requestedQuantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo quedan ${ticketType.availableQuantity} boletos disponibles.`,
      });
    }

    // 3. 🔒 CÁLCULO SEGURO EN EL BACKEND (Adiós a los montos del frontend)
    const unitPrice = parseFloat(ticketType.price);
    const rawSubtotal = unitPrice * requestedQuantity;

    let discountAmount = 0;
    let appliedCouponId = null;

    // 4. Validar Cupón si fue enviado (Solo aplica si paymentType === 'FULL')
    if (couponId && paymentType === "FULL") {
      const coupon = await Coupon.findOne({
        where: { id: couponId, isActive: true },
        transaction,
      });

      if (coupon) {
        const now = new Date();
        const isValidDates =
          (!coupon.validFrom || now >= new Date(coupon.validFrom)) &&
          (!coupon.validUntil || now <= new Date(coupon.validUntil));

        const hasUses = !coupon.maxUses || coupon.currentUses < coupon.maxUses;
        const matchesEvent =
          !coupon.eventId || Number(coupon.eventId) === Number(eventId);
        const meetsMinPurchase =
          rawSubtotal >= parseFloat(coupon.minPurchaseAmount || 0);

        if (isValidDates && hasUses && matchesEvent && meetsMinPurchase) {
          appliedCouponId = coupon.id;
          const couponValue = parseFloat(coupon.discountValue);

          if (coupon.discountType === "FIXED") {
            discountAmount = Math.min(rawSubtotal, couponValue);
          } else if (coupon.discountType === "PERCENTAGE") {
            discountAmount = (rawSubtotal * couponValue) / 100;
          }

          // Incrementar uso del cupón de manera atómica
          await coupon.increment("currentUses", { by: 1, transaction });
        }
      }
    }

    // 5. Cálculos Oficiales de Totales y Saldos
    const totalAmountCalculated = Math.max(0, rawSubtotal - discountAmount);

    let totalPaidCalculated = 0;
    let balancePendingCalculated = 0;

    if (paymentType === "FULL") {
      totalPaidCalculated = totalAmountCalculated;
      balancePendingCalculated = 0;
    } else if (paymentType === "PLAN") {
      const depositPercentage = event.depositPercentage
        ? parseFloat(event.depositPercentage)
        : 40; // 40% por defecto o lo que tenga configurado el evento
      totalPaidCalculated = (totalAmountCalculated * depositPercentage) / 100;
      balancePendingCalculated = totalAmountCalculated - totalPaidCalculated;
    }
    const generateOrderNumber = () => {
      const prefix = "WAP";
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // AAMMDD
      return `${prefix}-${datePart}-${randomPart}`;
    };
    let orderNumber;
    let isUnique = false;

    while (!isUnique) {
      orderNumber = generateOrderNumber();
      const existingOrder = await Order.findOne({
        where: { orderNumber },
        transaction,
      });
      if (!existingOrder) {
        isUnique = true; // Salimos del bucle cuando garantizamos que es único
      }
    }

    // 6. Crear Registro de Orden con los datos calculados por el servidor
    const newOrder = await Order.create(
      {
        eventId,
        ticketTypeId,
        couponId: appliedCouponId,
        quantity: requestedQuantity,
        orderNumber: orderNumber,
        unitPrice,
        subtotal: parseFloat(rawSubtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        totalAmount: parseFloat(totalAmountCalculated.toFixed(2)),
        totalPaid: parseFloat(totalPaidCalculated.toFixed(2)),
        balancePending: parseFloat(balancePendingCalculated.toFixed(2)),
        paymentType,
        status: "pending_payment",
        customerName: customerDetails?.name,
        customerEmail: customerDetails?.email,
        customerUsername: customerDetails?.username,
      },
      { transaction },
    );
    const generateTicketCode = () => {
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase();
      return `TKT-${timestamp}-${randomStr}`;
    };
    // 7. Generar los Registros de Tickets Individuales / Asientos
    const ticketsToCreate = [];
    if (selectedSeats.length > 0) {
      selectedSeats.forEach((seat) => {
        ticketsToCreate.push({
          orderId: newOrder.id,
          ticketTypeId,
          ticketCode: generateTicketCode(),
          seatNumber: seat.seatNumber || seat,
          status: "reserved",
        });
      });
    } else {
      for (let i = 0; i < requestedQuantity; i++) {
        ticketsToCreate.push({
          orderId: newOrder.id,
          ticketTypeId,
          ticketCode: generateTicketCode(),
          status: "reserved",
        });
      }
    }

    await Ticket.bulkCreate(ticketsToCreate, { transaction });

    // 8. Actualizar Stock de Boletos
    await ticketType.decrement("availableQuantity", {
      by: requestedQuantity,
      transaction,
    });

    // 9. Integración con Stripe Checkout (Usando el monto oficial calculado)
    const amountToChargeInCents = Math.round(newOrder.totalPaid * 100);
    const idempotencyKey = `order_${newOrder.id}_${Date.now()}`;
    const session = await stripe.checkout.sessions.create(
      {
        // payment_method_types: ["card", "oxxo"],
        mode: "payment",
        customer_email: customerDetails.email,
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: {
                name: `Boleto ${ticketType.name} - ${event.title}`,
                description:
                  paymentType === "PLAN"
                    ? "Enganche / Primer Pago"
                    : "Pago de Contado",
              },
              unit_amount: amountToChargeInCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: newOrder.id,
          eventId: eventId,
          paymentType: paymentType,
        },
        success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      },
      {
        idempotencyKey: idempotencyKey,
      },
    );

    newOrder.stripeSessionId = session.id;
    await newOrder.save({ transaction });

    // Confirmar transacción en la BD
    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Orden y reserva registradas correctamente.",
      checkoutUrl: session.url, // Corregido typo anterior ('chekcoutUrl' -> 'checkoutUrl')
      orderId: newOrder.id,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al crear la orden de compra:", error);
    return res.status(500).json({
      success: false,
      message: "Ocurrió un error al procesar la reserva de boletos.",
    });
  }
};
