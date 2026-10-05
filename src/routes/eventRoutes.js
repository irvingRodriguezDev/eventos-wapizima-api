const express = require("express");
const {
  getAllEvents,
  getEventById,
  createEvent,
} = require("../controllers/EventController");
const router = express.Router();

// Lectura pública de eventos
router.get("/", getAllEvents);
router.get("/:id", getEventById);

// Creación de evento (puedes agregar middleware de auth/admin si lo requiere)
router.post("/", createEvent);

module.exports = router;
