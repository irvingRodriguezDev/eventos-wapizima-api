const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventImage = sequelize.define(
  "EventImage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Garantiza estricta relación 1 a 1 (Solo una portada por evento)
      references: {
        model: "events",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    s3Key: {
      type: DataTypes.STRING(512),
      allowNull: false, // "events/cover-123.jpg"
    },
  },
  {
    tableName: "event_images",
    timestamps: true,
  },
);

module.exports = EventImage;
