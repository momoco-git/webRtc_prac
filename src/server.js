import express from "express";
import http from "http";
import WebSocket from "ws";
import SocketIo from "socket.io";
const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => {
  res.render("home");
});
const server = http.createServer(app);
const Io = SocketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
// const wss = new WebSocket.Server({ server });

Io.on("connection", socket => {
  socket.on("join_room", room => {
    socket.join(room);
    socket.to(room).emit("welcome");
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:8080`);
server.listen(8080, handleListen);
