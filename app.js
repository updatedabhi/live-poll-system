const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
const userRouter = require("./routes/userRoutes");
const pollRouter = require("./routes/pollRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: "https://cerulean-bublanina-12d295.netlify.app/",
    credentials: true,
  })
);

app.use("/api/users", userRouter);
app.use("/api/polls", pollRouter);

module.exports = app;
