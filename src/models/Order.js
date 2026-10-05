const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nulo si la compra fue directa de contado sin pasar por plan de abonos
      references: {
        model: "reservations",
        key: "id",
      },
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "events",
        key: "id",
      },
    },
    orderNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true, // Folio definitivo de la orden (ej: ORD-100234)
    },
    customerName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    totalPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Total liquidado al 100%
    },
    paymentType: {
      type: DataTypes.ENUM("full_payment", "payment_plan_settled"),
      defaultValue: "payment_plan_settled",
    },
    emailSentAt: {
      type: DataTypes.DATE,
      allowNull: true, // Marca de tiempo cuando se enviaron los boletos/QR por correo
    },
    status: {
      type: DataTypes.ENUM("completed", "refunded", "cancelled"),
      defaultValue: "completed",
    },
  },
  {
    tableName: "orders",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Order;
