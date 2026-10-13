const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TicketType = sequelize.define("TicketType", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false }, // Ej: General, VIP
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // $1,000.00
  totalQuantity: { type: DataTypes.INTEGER, allowNull: false },
  availableQuantity: { type: DataTypes.INTEGER, allowNull: false },
  color: { type: DataTypes.STRING(10), allowNull: true }, // Color en formato hexadecimal
});

module.exports = TicketType;
