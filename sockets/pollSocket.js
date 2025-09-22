const jwt = require("jsonwebtoken");
const Poll = require("../models/pollModel");
const Answer = require("../models/ansModel");
const User = require("../models/userModel");

let teacherReady = false;
let currentPoll = null;
let pollTimer = null;

const pollSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));

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

    if (socket.user.role === "Teacher") {
      // Teacher ready
      socket.on("teacher-ready", () => {
        teacherReady = true;
        io.emit("teacher-ready", { ready: true });
        console.log("Teacher is ready!");
      });

      // Join poll room
      socket.on("join-poll-room", (pollId) => {
        socket.join(pollId);
        console.log(`Teacher joined poll room: ${pollId}`);
        console.log("Rooms of teacher socket:", socket.rooms);
      });

      // Create poll
      socket.on("create-poll", async ({ question, options, duration = 60 }) => {
        try {
          const lastPoll = await Poll.findOne().sort({ createdAt: -1 });
          if (lastPoll) {
            const totalStudents = await User.countDocuments({
              role: "Student",
            });
            const answeredCount = await Answer.countDocuments({
              poll: lastPoll._id,
            });
            if (answeredCount < totalStudents) {
              socket.emit(
                "error",
                "Previous poll not completed by all students"
              );
              return;
            }
          }

          const poll = await Poll.create({
            question,
            options,
            createdBy: socket.user.id,
          });

          currentPoll = poll;

          io.emit("poll-created", {
            _id: poll._id,
            question: poll.question,
            options: poll.options,
            duration,
          });

          socket.join(poll._id.toString());
          console.log(`Teacher joined new poll room: ${poll._id}`);
          console.log("Rooms of teacher socket after create:", socket.rooms);

          // Start poll timer
          if (pollTimer) clearTimeout(pollTimer);
          pollTimer = setTimeout(async () => {
            const answers = await Answer.find({ poll: poll._id });
            const total = answers.length;

            const results = poll.options.map((opt, index) => {
              const count = answers.filter(
                (a) => a.selectedOption === index
              ).length;
              return {
                option: opt.text,
                count,
                percentage: total ? ((count / total) * 100).toFixed(2) : 0,
              };
            });

            io.to(poll._id.toString()).emit("poll-ended", {
              totalResponses: total,
              results,
            });
            currentPoll = null;
          }, duration * 1000);
        } catch (err) {
          console.error("Error creating poll:", err);
          socket.emit("error", "Failed to create poll");
        }
      });
    }

    if (socket.user.role === "Student") {
      // Check teacher status
      socket.on("check-teacher-status", () => {
        socket.emit("teacher-status", { ready: teacherReady });
      });

      // Join poll room
      socket.on("join-poll", (pollId) => {
        socket.join(pollId);
        console.log(`Student joined poll room: ${pollId}`);
        console.log("Rooms of student socket:", socket.rooms);
      });

      // Submit answer
      socket.on("submit-answer", async ({ pollId, selectedOption }) => {
        console.log(`Student submitting answer to poll: ${pollId}`);
        try {
          const poll = await Poll.findById(pollId);
          if (!poll) {
            socket.emit("error", "Poll not active");
            return;
          }

          const existing = await Answer.findOne({
            poll: pollId,
            student: socket.user.id,
          });
          if (existing) {
            socket.emit("error", "You already answered this poll");
            return;
          }

          await Answer.create({
            poll: pollId,
            student: socket.user.id,
            selectedOption,
          });

          const answers = await Answer.find({ poll: pollId });
          const totalResponses = answers.length;

          const results = poll.options.map((opt, index) => {
            const count = answers.filter(
              (a) => a.selectedOption === index
            ).length;
            return {
              option: opt.text,
              count,
              percentage: totalResponses
                ? ((count / totalResponses) * 100).toFixed(2)
                : 0,
            };
          });

          console.log("Emitting answer-submitted to room:", pollId);
          io.to(pollId).emit("answer-submitted", { results, totalResponses });
        } catch (err) {
          console.error("Error submitting answer:", err);
          socket.emit("error", "Failed to submit answer");
        }
      });
    }

    socket.on("disconnect", () => {
      console.log(`${socket.user.role} disconnected: ${socket.id}`);
    });
  });
};

module.exports = pollSocket;
