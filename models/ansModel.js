const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  poll: { type: mongoose.Schema.Types.ObjectId, ref: "Poll" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedOption: Number,
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Answer", answerSchema);
