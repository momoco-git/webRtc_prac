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
  socket["nickName"] = "Anon";
  socket.on("nickName", nickName => (socket["nickName"] = nickName));
  socket.on("enter_room", (roomName, done) => {
    console.log("방이름", roomName);
    socket.join(roomName);
    console.log(socket.rooms);
    socket.to(roomName).emit("welcome", socket.nickName);
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach(room => {
      socket.to(room).emit("bye", socket.nickName);
    });
  });
  socket.on("new_message", (msg, room) => {
    console.log(socket.nickName);
    console.log(socket.rooms);
    console.log(socket);
    socket.to(room).emit("no1_message", `${socket.nickName}: ${msg}`);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:8080`);
server.listen(8080, handleListen);
