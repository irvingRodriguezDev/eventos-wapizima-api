const express = require("express");
const router = express.Router();

const eventRoutes = require("./eventRoutes");
const ticketTypeRoutes = require("./ticketTypeRoutes");
const webhookRoutes = require("./webhookRoutes");
const couponRoutes = require("./couponRoutes");
const orderRoutes = require("./orderRoutes");
router.use("/events", eventRoutes);
router.use("/coupons", couponRoutes);
router.use("/ticket-types", ticketTypeRoutes);
router.use("/orders", orderRoutes);
router.use("/webhooks", webhookRoutes);

module.exports = router;
