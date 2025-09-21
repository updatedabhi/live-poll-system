const Poll = require("../models/pollModel");
const Answer = require("../models/ansModel");
const User = require("../models/userModel");

const createPoll = async (req, res) => {
  try {
    const { question, options } = req.body;

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

    const poll = await Poll.create({
      question,
      options,
      createdBy: req.user._id,
    });

    res.status(201).json({ status: "success", data: poll });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getPoll = async (req, res) => {
  try {
    const poll = await Poll.findOne().sort({ createdAt: -1 });

    if (!poll) {
      return res.status(404).json({
        status: "fail",
        message: "No poll available",
      });
    }

    res.status(200).json({
      status: "success",
      data: poll,
    });
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

module.exports = {
  createPoll,
  submitAnswer,
  getPollResults,
  getLivePollStats,
  getPollHistory,
};
