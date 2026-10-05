const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventPaymentPlan = sequelize.define(
  "EventPaymentPlan",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // 1 a 1 con Event (cada evento tiene 1 plan de pagos configurado)
      references: {
        model: "events",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    minDepositType: {
      type: DataTypes.ENUM("fixed_amount", "percentage"),
      allowNull: false,
      defaultValue: "fixed_amount",
    },
    minDepositValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Ej: 10000.00 o 20.00 (%)
    },
    totalInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // Si es 1, es pago único de contado
    },
    finalPaymentDeadline: {
      type: DataTypes.DATEONLY,
      allowNull: false, // Fecha límite global para haber liquidado el 100%
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "event_payment_plans",
    timestamps: true,
  },
);

module.exports = EventPaymentPlan;
