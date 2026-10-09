const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  ticketTypeId: { type: DataTypes.INTEGER, allowNull: false },
  orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true }, // WAP-89234
  customerName: { type: DataTypes.STRING(150), allowNull: false },
  customerEmail: { type: DataTypes.STRING(150), allowNull: false },
  customerPhone: { type: DataTypes.STRING(20), allowNull: true },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },

  // Contabilidad limpia
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // $1,000
  totalPaid: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 }, // $200 (se actualiza con cada pago)
  balancePending: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // $800

  status: {
    type: DataTypes.ENUM("pending_payment", "completed", "cancelled"),
    defaultValue: "pending_payment", // "completed" cuando balancePending === 0
  },
});

module.exports = Order;
