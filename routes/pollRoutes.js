const express = require("express");
const router = express.Router();
const roleTeacher = require("../middleware/role");
const pollController = require("../controllers/pollController");
const protect = require("../middleware/authMiddleware");

router.route("/emtpy-ans").delete(pollController.emptyAnswers);
router.route("/history").get(pollController.getPollHistory);
router.route("/view-result/:id").get(pollController.getPollResults);
router
  .route("/:id")
  .get(pollController.getPollById)
  .delete(pollController.deletePoll);
router.route("/create").post(protect, pollController.createPoll);
router.route("/submit").post(protect, pollController.submitAnswer);
router.route("/latest").get(protect, pollController.getLatestPoll);
router
  .route("/:pollId/participants")
  .get(protect, roleTeacher, pollController.getParticipants);
router
  .route("/:pollId/kick")
  .post(protect, roleTeacher, pollController.kickParticipant);

module.exports = router;
