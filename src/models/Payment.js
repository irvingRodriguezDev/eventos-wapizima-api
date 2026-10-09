const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define("Payment", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // $200.00
  paymentMethod: { type: DataTypes.STRING, defaultValue: "stripe" }, // stripe, oxxo, transfer
  stripePaymentIntentId: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM("pending", "succeeded", "failed"),
    defaultValue: "succeeded",
  },
});
module.exports = Payment;
