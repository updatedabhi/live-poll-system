const jwt = require("jsonwebtoken");
const Poll = require("../models/pollModel");
const Answer = require("../models/ansModel");

const pollSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user; 
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`${socket.user.role} connected: ${socket.id}`);

    socket.on("join-poll", (pollId) => {
      socket.join(pollId);
      console.log(`${socket.user.role} joined poll ${pollId}`);
    });

    socket.on("start-poll", async ({ pollId, question }) => {
      if (socket.user.role !== "teacher") return;

      const poll = await Poll.findById(pollId);
      if (!poll) return;

      io.to(pollId).emit("new-question", poll);
    });

    socket.on("submit-answer", async ({ pollId, selectedOption }) => {
      if (socket.user.role !== "student") return;

      const existing = await Answer.findOne({
        poll: pollId,
        student: socket.user.userId,
      });
      if (existing) {
        socket.emit("error", "You have already answered this poll");
        return;
      }

      await Answer.create({
        poll: pollId,
        student: socket.user.userId,
        selectedOption,
      });

      const answers = await Answer.find({ poll: pollId });

      const poll = await Poll.findById(pollId);
      const total = answers.length;
      const optionStats = poll.options.map((opt, index) => {
        const count = answers.filter(a => a.selectedOption === index).length;
        return {
          option: opt.text,
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(2) : "0.00",
        };
      });

      io.to(pollId).emit("answer-submitted", {
        totalResponses: total,
        results: optionStats,
      });
    });
  });
};

module.exports = pollSocket;
