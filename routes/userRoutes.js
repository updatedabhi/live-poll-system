const express = require("express");
const router = express.Router();
const { isTeacher } = require("../middleware/role");
const userController = require("../controllers/userController");

router.route("/register").post(userController.createUser);

module.exports = router;
