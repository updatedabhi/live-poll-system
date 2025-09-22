const dotenv = require("dotenv");
const mongoose = require("mongoose");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const pollSocket = require("./sockets/pollSocket");

dotenv.config();

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB error:", err));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://cerulean-bublanina-12d295.netlify.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);
pollSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
