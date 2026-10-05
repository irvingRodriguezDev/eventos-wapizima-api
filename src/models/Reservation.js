const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Reservation = sequelize.define(
  "Reservation",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "events",
        key: "id",
      },
    },
    ticketTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ticket_types",
        key: "id",
      },
    },
    reservationCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true, // Folio único (ej. RES-89234)
    },
    // Identificador único del cliente para búsquedas
    customerName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING(150),
      allowNull: false, // Criterio principal de búsqueda en el sistema
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    // Contabilidad
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalPaid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    balancePending: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "cancelled", "expired"),
      defaultValue: "active",
    },
    nextDueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "reservations",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Reservation;
