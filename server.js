const dotenv = require("dotenv");
const mongoose = require("mongoose");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const pollSocket = require("./sockets/pollSocket");

dotenv.config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB connection successful!"))
  .catch((err) => console.log("Error connecting to DB:", err));

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

pollSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
