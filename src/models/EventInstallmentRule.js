const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventInstallmentRule = sequelize.define(
  "EventInstallmentRule",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventPaymentPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "event_payment_plans",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    installmentNumber: {
      type: DataTypes.INTEGER,
      allowNull: false, // 1 (Apartado), 2, 3, 4...
    },
    suggestedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Monto mínimo sugerido para este pago (ej: 10000.00 o 5000.00)
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false, // Fecha límite de esta cuota
    },
  },
  {
    tableName: "event_installment_rules",
    timestamps: true,
  },
);

module.exports = EventInstallmentRule;
