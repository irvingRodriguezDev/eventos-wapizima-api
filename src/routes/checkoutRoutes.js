const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkoutController");

// Creación de sesiones de pago en Stripe
router.post("/initial", checkoutController.createInitialCheckoutSession);
router.post(
  "/installment",
  checkoutController.createInstallmentCheckoutSession,
);

module.exports = router;
