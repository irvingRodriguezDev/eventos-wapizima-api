function setupAssociations(models) {
  const {
    Event,
    EventImage,
    EventPaymentPlan,
    EventInstallmentRule,
    TicketType,
    Ticket,
    Reservation,
    Order,
    Transaction,
  } = models;

  // 1. EVENTO Y IMAGEN (1 a 1)
  Event.hasOne(EventImage, {
    foreignKey: "eventId",
    as: "image",
    onDelete: "CASCADE",
  });
  EventImage.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  // 2. EVENTO Y PLAN DE PAGOS (1 a 1)
  Event.hasOne(EventPaymentPlan, {
    foreignKey: "eventId",
    as: "paymentPlan",
    onDelete: "CASCADE",
  });
  EventPaymentPlan.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  // 3. PLAN DE PAGOS Y CUOTAS (1 a N)
  EventPaymentPlan.hasMany(EventInstallmentRule, {
    foreignKey: "eventPaymentPlanId",
    as: "installmentRules",
    onDelete: "CASCADE",
  });
  EventInstallmentRule.belongsTo(EventPaymentPlan, {
    foreignKey: "eventPaymentPlanId",
    as: "paymentPlan",
  });

  // 4. EVENTO Y TIPOS DE BOLETOS (1 a N)
  Event.hasMany(TicketType, {
    foreignKey: "eventId",
    as: "ticketTypes",
    onDelete: "CASCADE",
  });
  TicketType.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  // 5. EVENTO CON RESERVACIONES Y ÓRDENES
  Event.hasMany(Reservation, { foreignKey: "eventId", as: "reservations" });
  Reservation.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  Event.hasMany(Order, { foreignKey: "eventId", as: "orders" });
  Order.belongsTo(Event, { foreignKey: "eventId", as: "event" });

  // 6. RESERVACIÓN Y ÓRDEN
  Reservation.hasOne(Order, { foreignKey: "reservationId", as: "order" });
  Order.belongsTo(Reservation, {
    foreignKey: "reservationId",
    as: "reservation",
  });

  // 7. BOLETOS
  TicketType.hasMany(Ticket, { foreignKey: "ticketTypeId", as: "tickets" });
  Ticket.belongsTo(TicketType, {
    foreignKey: "ticketTypeId",
    as: "ticketType",
  });

  Reservation.hasMany(Ticket, { foreignKey: "reservationId", as: "tickets" });
  Ticket.belongsTo(Reservation, {
    foreignKey: "reservationId",
    as: "reservation",
  });

  Order.hasMany(Ticket, { foreignKey: "orderId", as: "tickets" });
  Ticket.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  // 8. TRANSACCIONES
  Reservation.hasMany(Transaction, {
    foreignKey: "reservationId",
    as: "transactions",
  });
  Transaction.belongsTo(Reservation, {
    foreignKey: "reservationId",
    as: "reservation",
  });

  Order.hasMany(Transaction, { foreignKey: "orderId", as: "transactions" });
  Transaction.belongsTo(Order, { foreignKey: "orderId", as: "order" });
}

module.exports = setupAssociations;
