const express = require("express");
const {
  getOrdersByUser,
  getShowOrder,
} = require("../controllers/ticketUserController");

const router = express.Router();

// Lectura pública de eventos
router.get("/ordersMe", getOrdersByUser);
router.get("/order/:id", getShowOrder);

module.exports = router;
