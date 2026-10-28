const express = require("express");
const {
  getDashboardMetrics,
  getLatestOrders,
  getSalesAnalytics,
  getEventsOccupancy,
} = require("../controllers/dashboardController");
const router = express.Router();

// Importa aquí tus middlewares de autenticación
// const { verifyToken, isAdmin } = require("../middlewares/auth");

// 🟢 RUTA PÚBLICA: Validar en Checkout (Modal BuyTickets)
router.get("/", getDashboardMetrics);
router.get("/latest-orders", getLatestOrders);
router.get("/sales-analytics", getSalesAnalytics);
router.get("/events-occupancy", getEventsOccupancy);

module.exports = router;
