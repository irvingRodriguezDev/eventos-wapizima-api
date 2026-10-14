const express = require("express");
const { handleUpload, upload } = require("../middlewares/uploadImage");
const {
  getEventBySlug,
  createEvent,
  getAllEventsDrafted,
  getAllEventsPublished,
  updateEventSettings,
} = require("../controllers/EventController");
const router = express.Router();

// Lectura pública de eventos
router.get("/draft", getAllEventsDrafted);
router.get("/published", getAllEventsPublished);
router.get("/:slug", getEventBySlug);
router.put("/:id/updateSettings", updateEventSettings);

// Creación de evento (puedes agregar middleware de auth/admin si lo requiere)
router.post("/", handleUpload(upload.single("image")), createEvent);

module.exports = router;
