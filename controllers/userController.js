const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const createUser = async (req, res) => {
  try {
    const { name, role } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        status: "fail",
        message: "Name and role are required",
      });
    }

    const newUser = await User.create({ name, role });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        status: "fail",
        message: err.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const emptyUser = async (req, res) => {
  try {
    await User.deleteMany({});
    return res.status(200).json("User emptied successfully");
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = { createUser, emptyUser };
