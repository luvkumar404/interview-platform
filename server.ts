import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { initSocketServer } from "./lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error("[Server] Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  initSocketServer(io);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (dev: ${dev})`);
  });
});
