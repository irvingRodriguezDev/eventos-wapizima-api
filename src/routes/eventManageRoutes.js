const express = require("express");
const router = express.Router();
const { getEventOverview } = require("../controllers/eventManageController");

// GET /api/admin/events/:id/overview
router.get("/:id/overview", getEventOverview);
router.get("/:id/orders", getOrdersByEventId);

module.exports = router;
