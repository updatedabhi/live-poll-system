const express = require("express");
const router = express.Router();
const roleTeacher = require("../middleware/role");
const pollController = require("../controllers/pollController");
const protect = require("../middleware/authMiddleware");

router.route("/view-result/:id").get(pollController.getPollResults);
router.route("/create").post(roleTeacher, pollController.createPoll);
router.route("/history").get(roleTeacher, pollController.getPollHistory);
router.route("/submit").post(protect, pollController.submitAnswer);

module.exports = router;
