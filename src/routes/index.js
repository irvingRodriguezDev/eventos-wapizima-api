const express = require("express");
const router = express.Router();

const eventRoutes = require("./eventRoutes");
const ticketTypeRoutes = require("./ticketTypeRoutes");
const reservationRoutes = require("./reservationRoutes");
const checkoutRoutes = require("./checkoutRoutes");
const webhookRoutes = require("./webhookRoutes");
const couponRoutes = require("./couponRoutes");

router.use("/events", eventRoutes);
router.use("/coupons", couponRoutes);
router.use("/ticket-types", ticketTypeRoutes);
router.use("/reservations", reservationRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/webhooks", webhookRoutes);

module.exports = router;
