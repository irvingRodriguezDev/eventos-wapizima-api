const express = require("express");
const { createOrder } = require("../controllers/orderController");

const router = express.Router();

// Lectura pública de eventos
router.post("/create-checkout", createOrder);

module.exports = router;
