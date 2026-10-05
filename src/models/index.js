const sequelize = require("../config/db");

const Event = require("./Event");
const EventImage = require("./EventImage");
const EventPaymentPlan = require("./EventPaymentPlan");
const EventInstallmentRule = require("./EventInstallmentRule");
const TicketType = require("./TicketType");
const Ticket = require("./Ticket");
const Reservation = require("./Reservation");
const Order = require("./Order");
const Transaction = require("./Transaction");

const setupAssociations = require("./associations");

const models = {
  Event,
  EventImage,
  EventPaymentPlan,
  EventInstallmentRule,
  TicketType,
  Ticket,
  Reservation,
  Order,
  Transaction,
};

setupAssociations(models);

module.exports = {
  sequelize,
  ...models,
};
