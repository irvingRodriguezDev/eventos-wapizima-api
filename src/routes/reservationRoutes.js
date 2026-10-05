const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");

// Consultas por email o folio único
router.get("/", reservationController.getReservationsByEmail);
router.get("/:code", reservationController.getReservationByCode);

module.exports = router;
