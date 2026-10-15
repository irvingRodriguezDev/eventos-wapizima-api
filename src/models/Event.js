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
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    mapa: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Bandera rápida para saber si activa el módulo de parcialidades
    allowsPaymentPlan: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    hasSeatingMap: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "completed", "cancelled"),
      defaultValue: "draft",
    },
    seatingMapConfig: {
      type: DataTypes.JSON, // Reservado para Konva
      allowNull: true,
      defaultValue: { elements: [] },
    },
    percentageInitialPayment: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    daysBeforePayment: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    tableName: "events",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Event;
