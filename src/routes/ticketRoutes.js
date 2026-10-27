const express = require("express");
const { validateTicket } = require("../controllers/ticketController");

const router = express.Router();

// Lectura pública de eventos
router.post("/validate", validateTicket);
module.exports = router;
