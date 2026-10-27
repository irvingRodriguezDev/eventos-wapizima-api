const express = require("express");
const {
  createOrder,
  createInstallmentCheckout,
} = require("../controllers/orderController");

const router = express.Router();

// Lectura pública de eventos
router.post("/create-checkout", createOrder);
router.post("/create-installment", createInstallmentCheckout);

module.exports = router;
