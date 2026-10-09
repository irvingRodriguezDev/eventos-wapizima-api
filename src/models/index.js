const sequelize = require("../config/db");

const Event = require("./Event");
const EventImage = require("./EventImage");
const EventPaymentPlan = require("./EventPaymentPlan");
const TicketType = require("./TicketType");
const Ticket = require("./Ticket");
const Order = require("./Order");
const Payment = require("./Payment");
const setupAssociations = require("./associations");

const models = {
  Event,
  EventImage,
  EventPaymentPlan,
  TicketType,
  Ticket,
  Payment,
  Order,
};

setupAssociations(models);

module.exports = {
  sequelize,
  ...models,
};
