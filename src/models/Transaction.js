const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Asociado a la reservación si es un abono parcial
      references: {
        model: "reservations",
        key: "id",
      },
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Asociado a la orden cuando se liquida
      references: {
        model: "orders",
        key: "id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Monto exacto abonado en esta transacción
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // ID único de Stripe (ej: pi_3MtwB2LkdIwA7iG11A123)
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: "card", // card, oxxo, spei, etc.
    },
    status: {
      type: DataTypes.ENUM("pending", "succeeded", "failed", "refunded"),
      defaultValue: "pending",
    },
    metadata: {
      type: DataTypes.TEXT, // O DataTypes.JSON para respaldar la respuesta de Stripe
      allowNull: true,
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
  },
);

module.exports = Transaction;
