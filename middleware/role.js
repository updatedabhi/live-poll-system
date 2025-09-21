const jwt = require("jsonwebtoken");

const roleTeacher = (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "Not authenticated, no token found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

    if (decoded.role !== "Teacher") {
      return res.status(403).json({
        status: "fail",
        message: "Access denied, only teachers can perform this action",
      });
    }

    req.user = decoded;

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }
};

module.exports = roleTeacher;
