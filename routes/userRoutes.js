const express = require("express");
const router = express.Router();
const { isTeacher } = require("../middleware/role");
const userController = require("../controllers/userController");

router.route("/register").post(userController.createUser);
router.route("/empty").delete(userController.emptyUser);

module.exports = router;
