const express = require("express");
const router = express.Router();
const ticketTypeController = require("../controllers/ticketTypeController");

// Rutas asociadas al contexto de un evento
router.get("/:eventId", ticketTypeController.getTicketTypesByEvent);
router.post("/:eventId", ticketTypeController.createTicketType);

// Rutas individuales para modificación/eliminación directas
router.put("/:id", ticketTypeController.updateTicketType);
router.delete("/:id", ticketTypeController.deleteTicketType);

module.exports = router;
