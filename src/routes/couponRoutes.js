const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");

// Importa aquí tus middlewares de autenticación
// const { verifyToken, isAdmin } = require("../middlewares/auth");

// 🟢 RUTA PÚBLICA: Validar en Checkout (Modal BuyTickets)
router.post("/validate", couponController.validateCoupon);

// 🔒 RUTAS ADMINISTRATIVAS
router.get("/admin", couponController.getAllCoupons);
router.post("/admin", couponController.createCoupon);
router.put("/admin/:id", couponController.updateCoupon);
router.patch("/admin/:id/toggle-status", couponController.toggleCouponStatus);
router.delete("/admin/:id", couponController.deleteCoupon);

module.exports = router;
