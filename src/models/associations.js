function setupAssociations(models) {
  const {
    Event,
    EventImage,
    EventPaymentPlan,
    TicketType,
    Ticket,
    Order,
    Payment,
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

  // 4. ORDEN DE COMPRA (PAGOS Y TICKETS)
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
}

module.exports = setupAssociations;
