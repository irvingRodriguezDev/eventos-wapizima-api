const express = require("express");
const { handleUpload, upload } = require("../middlewares/uploadImage");
const {
  getAllEvents,
  getEventBySlug,
  createEvent,
} = require("../controllers/EventController");
const router = express.Router();

// Lectura pública de eventos
router.get("/", getAllEvents);
router.get("/:slug", getEventBySlug);

// Creación de evento (puedes agregar middleware de auth/admin si lo requiere)
router.post("/", handleUpload(upload.single("image")), createEvent);

module.exports = router;
