const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Ticket = sequelize.define(
  "Ticket",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticketTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ticket_types",
        key: "id",
      },
    },
    // Nota: La relación con 'orderId' la conectaremos cuando lleguemos al módulo de Órdenes
    ticketCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true, // Código único (UUID/Hash) que se renderiza en el QR
    },
    seatIdentifier: {
      type: DataTypes.STRING(50),
      allowNull: true, // Queda NULL por ahora (General). En el futuro guardará "A-12", "Fila 3 - Asiento 5", etc.
    },
    isReleased: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // FALSE mientras tenga saldo pendiente. TRUE cuando balancePending === 0
    },
    status: {
      type: DataTypes.ENUM("reserved", "valid", "used", "cancelled"),
      defaultValue: "reserved",
      // 'reserved': Apartado en plan de pagos
      // 'valid': Liquidado y listo para acceso
      // 'used': Ya escaneado en puerta el día del evento
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true, // Registro de fecha y hora cuando se valida en puerta
    },
  },
  {
    tableName: "tickets",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Ticket;
