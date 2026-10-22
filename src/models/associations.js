function setupAssociations(models) {
  const {
    Event,
    EventImage,
    EventPaymentPlan,
    TicketType,
    Ticket,
    Order,
    Payment,
    Coupon, // 👈 1. Incluimos el modelo Coupon
  } = models;

  // Diagnóstico para detectar qué modelo no se importó correctamente
  const requiredModels = {
    Event,
    EventImage,
    EventPaymentPlan,
    TicketType,
    Ticket,
    Order,
    Payment,
    Coupon, // 👈 2. Lo agregamos al diagnóstico de validación
  };
  Object.entries(requiredModels).forEach(([name, model]) => {
    if (!model) {
      throw new Error(
        `El modelo '${name}' es undefined. Revisa su require o module.exports.`,
      );
    }
  });

  // 1. EVENTO E IMAGEN (1 a 1)
  Event.hasOne(EventImage, {
    foreignKey: "eventId",
    as: "image",
    onDelete: "CASCADE",
  });
  EventImage.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  // 2. EVENTO Y SUS COMPONENTES
  Event.hasMany(TicketType, {
    foreignKey: "eventId",
    as: "ticketTypes",
    onDelete: "CASCADE",
  });
  TicketType.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  Event.hasMany(EventPaymentPlan, {
    foreignKey: "eventId",
    as: "paymentPlan",
    onDelete: "CASCADE",
  });
  EventPaymentPlan.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  Event.hasMany(Order, {
    foreignKey: "eventId",
    as: "orders",
  });
  Order.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  // 🎟️ NUEVO: RELACIÓN EVENTO Y CUPONES
  // Un evento puede tener asociados múltiples cupones
  Event.hasMany(Coupon, {
    foreignKey: "eventId",
    as: "coupons",
    onDelete: "SET NULL", // Si se elimina el evento, el cupón no se borra, pasa a ser global (o NULL)
  });
  Coupon.belongsTo(Event, {
    foreignKey: "eventId",
    as: "event",
  });

  // 3. TIPOS DE BOLETOS
  TicketType.hasMany(Order, {
    foreignKey: "ticketTypeId",
    as: "orders",
  });
  Order.belongsTo(TicketType, { foreignKey: "ticketTypeId", as: "ticketType" });

  TicketType.hasMany(Ticket, {
    foreignKey: "ticketTypeId",
    as: "tickets",
  });
  Ticket.belongsTo(TicketType, {
    foreignKey: "ticketTypeId",
    as: "ticketType",
  });

  // 4. ORDEN DE COMPRA (PAGOS, TICKETS Y CUPÓN)
  Order.hasMany(Payment, {
    foreignKey: "orderId",
    as: "payments",
    onDelete: "CASCADE",
  });
  Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  Order.hasMany(Ticket, {
    foreignKey: "orderId",
    as: "tickets",
    onDelete: "CASCADE",
  });
  Ticket.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  // 🏷️ NUEVO: RELACIÓN CUPÓN Y ORDEN DE COMPRA
  // Una orden puede haber aplicado un cupón de descuento
  Coupon.hasMany(Order, {
    foreignKey: "couponId",
    as: "orders",
  });
  Order.belongsTo(Coupon, {
    foreignKey: "couponId",
    as: "coupon",
  });
}

module.exports = setupAssociations;
