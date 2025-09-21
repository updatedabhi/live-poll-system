const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const userRotuer = require("./routes/userRoutes")
const pollRouter = require("./routes/pollRoutes")

app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(cookieParser());


app.use("/api/users", userRotuer)
app.use("/api/polls", pollRouter)

module.exports = app