const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mapa: {
      type: DataTypes.TEXT, // O DataTypes.JSON si guardas la estructura de Konva/Asientos
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalTickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2), // Permite manejo exacto de montos y centavos
      allowNull: false,
    },
    // Configuración para el Módulo de Plan de Pagos
    allowsPaymentPlan: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // Si es false, exige el 100% en una sola exhibición
    },
    minDepositAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // Monto mínimo requerido para apartar (ej: $10,000 en eventos de $25,000)
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "published",
        "sold_out",
        "completed",
        "cancelled",
      ),
      defaultValue: "published",
    },
  },
  {
    tableName: "events",
    timestamps: true,
    paranoid: true, // Habilita soft deletes (deletedAt)
  },
);

module.exports = Event;
