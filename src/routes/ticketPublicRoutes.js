const express = require("express");
const { getTicketByCode } = require("../controllers/ticketPublicController");

const router = express.Router();

// Lectura pública de eventos
router.get("/public/:code", getTicketByCode);
module.exports = router;
