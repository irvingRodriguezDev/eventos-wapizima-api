const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventPaymentPlan = sequelize.define("EventPaymentPlan", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  step: { type: DataTypes.INTEGER, allowNull: false }, // 1, 2, 3...
  concept: { type: DataTypes.STRING(100), allowNull: false }, // "Inscripción", "Semana 1"
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // 200.00, 400.00
  dueDate: { type: DataTypes.DATEONLY, allowNull: true }, // Opcional
  note: { type: DataTypes.STRING, allowNull: true },
});

module.exports = EventPaymentPlan;
