const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Event = sequelize.define("Event", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  mapa: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING, allowNull: false },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM("draft", "published", "completed", "cancelled"),
    defaultValue: "draft",
  },
  // Si deseas guardar la distribución del mapa de Konva
  seatingMapConfig: { type: DataTypes.TEXT, allowNull: true },
});

module.exports = Event;
