const express = require("express");
const router = express.Router();

const eventRoutes = require("./eventRoutes");
const reservationRoutes = require("./reservationRoutes");
const checkoutRoutes = require("./checkoutRoutes");
const webhookRoutes = require("./webhookRoutes");

router.use("/events", eventRoutes);
router.use("/reservations", reservationRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/webhooks", webhookRoutes);

module.exports = router;
