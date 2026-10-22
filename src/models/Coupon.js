const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Coupon = sequelize.define(
  "Coupon",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      set(value) {
        // Formatea el código automáticamente en mayúsculas y sin espacios
        if (value) {
          this.setDataValue("code", value.trim().toUpperCase());
        }
      },
    },
    discountType: {
      type: DataTypes.ENUM("FIXED", "PERCENTAGE"),
      allowNull: false,
      defaultValue: "FIXED",
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    minPurchaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    maxUses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    currentUses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    validFrom: {
      type: DataTypes.DATE, // Correcto en Sequelize (DATETIME en SQL)
      allowNull: true,
    },
    validUntil: {
      type: DataTypes.DATE, // Correcto en Sequelize (DATETIME en SQL)
      allowNull: true,
    },
    applicablePaymentType: {
      type: DataTypes.ENUM("FULL", "PLAN", "ALL"),
      allowNull: false,
      defaultValue: "FULL", // 👈 Forzamos la regla psicológica: Solo compras de contado
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // 👈 'true' en minúsculas
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL significa que el cupón aplica de manera global
    },
  },
  {
    tableName: "coupons",
    timestamps: true,
    paranoid: true, // Soft delete (deletedAt)
  },
);

module.exports = Coupon;
