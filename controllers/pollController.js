const Poll = require("../models/pollModel");
const Answer = require("../models/ansModel");
const User = require("../models/userModel");

const createPoll = async (req, res) => {
  try {
    const { question, options, duration } = req.body;

    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }

    // Check previous poll completion
    const lastPoll = await Poll.findOne().sort({ createdAt: -1 });
    if (lastPoll) {
      const totalStudents = await User.countDocuments({ role: "Student" });
      const answeredCount = await Answer.countDocuments({ poll: lastPoll._id });

      if (answeredCount < totalStudents) {
        return res.status(400).json({
          status: "fail",
          message:
            "Cannot create a new poll until all students have answered the last one",
        });
      }
    }

    // Create poll
    const poll = await Poll.create({
      question,
      options,
      duration,
      createdBy: req.user._id,
    });

    // Emit teacher-ready event to all students
    const io = req.app.get("io");
    io.emit("teacher-ready", { pollId: poll._id });

    res.status(201).json({ status: "success", data: poll });
  } catch (err) {
    console.log("Create poll error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getPollById = async (req, res) => {
  try {
    let { id } = req.params;
    let poll;

    if (id === "latest") {
      poll = await Poll.findOne().sort({ createdAt: -1 });
    } else {
      poll = await Poll.findById(id);
    }

    if (!poll) {
      return res
        .status(404)
        .json({ status: "fail", message: "Poll not found" });
    }

    res.status(200).json({ status: "success", data: poll });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { pollId, selectedOption } = req.body;

    if (!pollId || selectedOption === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Poll ID and selected option are required",
      });
    }

    const answer = await Answer.create({
      poll: pollId,
      student: req.user._id,
      selectedOption,
    });

    res.status(201).json({ status: "success", data: answer });
  } catch (err) {
    console.log("error submit: " + err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getPollResults = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    const poll = await Poll.findById(id);
    if (!poll) {
      return res
        .status(404)
        .json({ status: "fail", message: "Poll not found" });
    }

    const answers = await Answer.find({ poll: id });

    if (answers.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No answers yet",
        data: poll.options.map((opt) => ({
          option: opt.text,
          percentage: 0,
          count: 0,
        })),
      });
    }

    const total = answers.length;
    const optionStats = poll.options.map((opt, index) => {
      const count = answers.filter(
        (ans) => ans.selectedOption === index
      ).length;
      return {
        option: opt.text,
        count,
        percentage: ((count / total) * 100).toFixed(2),
      };
    });

    res.status(200).json({
      status: "success",
      totalResponses: total,
      results: optionStats,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getLivePollStats = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res
        .status(404)
        .json({ status: "fail", message: "Poll not found" });
    }

    const answers = await Answer.find({ poll: pollId });
    const total = answers.length;

    const optionStats = poll.options.map((opt, index) => {
      const count = answers.filter(
        (ans) => ans.selectedOption === index
      ).length;
      return {
        option: opt.text,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) : "0.00",
      };
    });

    res.status(200).json({
      status: "success",
      totalResponses: total,
      results: optionStats,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getPollHistory = async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });

    const history = await Promise.all(
      polls.map(async (poll) => {
        const answers = await Answer.find({ poll: poll._id });
        const total = answers.length;

        const optionStats = poll.options.map((opt, index) => {
          const count = answers.filter(
            (ans) => ans.selectedOption === index
          ).length;
          return {
            option: opt.text,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(2) : "0.00",
          };
        });

        return {
          pollId: poll._id,
          question: poll.question,
          createdAt: poll.createdAt,
          totalResponses: total,
          results: optionStats,
        };
      })
    );

    res.status(200).json({
      status: "success",
      history,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getLatestPoll = async (req, res) => {
  try {
    const latestPoll = await Poll.findOne().sort({ createdAt: -1 });
    if (!latestPoll) {
      return res.status(200).json({ status: "success", data: null });
    }
    res.status(200).json({ status: "success", data: latestPoll });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const emptyAnswers = async (req, res) => {
  try {
    await Answer.deleteMany({});
    return res.status(200).json("Answers emptied successfully");
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

const deletePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findByIdAndDelete(id);
    if (!poll) {
      return res
        .status(404)
        .json({ status: "fail", message: "Poll not found" });
    }
    await Answer.deleteMany({ poll: id });
    return res.status(200).json({ status: "success", message: "Poll deleted" });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

const getParticipants = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId).populate("participants", "name");
    if (!poll) {
      return res
        .status(404)
        .json({ status: "fail", message: "Poll not found" });
    }

    res.status(200).json({
      status: "success",
      data: poll.participants || [],
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const kickParticipant = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { userId } = req.body;

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res
        .status(404)
        .json({ status: "fail", message: "Poll not found" });
    }

    poll.participants = poll.participants.filter(
      (id) => id.toString() !== userId
    );
    await poll.save();

    res
      .status(200)
      .json({ status: "success", message: "Participant kicked out" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = {
  getPollById,
  createPoll,
  submitAnswer,
  getPollResults,
  getLivePollStats,
  getPollHistory,
  getLatestPoll,
  emptyAnswers,
  deletePoll,
  getParticipants,
  kickParticipant,
};
