const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TicketType = sequelize.define(
  "TicketType",
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
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false, // Ej: "Acceso General", "General Preferente", "VIP"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Costo total del boleto
    },
    totalQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false, // Cupo total de este tipo de boleto
    },
    availableQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false, // Boletos que aún quedan libres para venta/apartado
    },
    // Campo reservado para cuando activemos el mapa interactivo de asientos en el futuro
    seatMapConfig: {
      type: DataTypes.TEXT, // O DataTypes.JSON (Guarda coordenadas/zonas de Konva si aplica)
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "ticket_types",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = TicketType;
