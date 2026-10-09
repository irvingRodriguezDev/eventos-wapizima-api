const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Ticket = sequelize.define("Ticket", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  ticketCode: { type: DataTypes.STRING(100), allowNull: false, unique: true }, // Para el QR
  seatIdentifier: { type: DataTypes.STRING(50), allowNull: true }, // "Fila A - 12" (Futuro Konva)
  isReleased: { type: DataTypes.BOOLEAN, defaultValue: false }, // TRUE solo cuando Order.status === 'completed'
  status: {
    type: DataTypes.ENUM("reserved", "valid", "used", "cancelled"),
    defaultValue: "reserved",
  },
});

module.exports = Ticket;
