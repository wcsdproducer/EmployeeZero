/**
 * Custom Next.js server with WebSocket support for Gemini Live voice proxy.
 * 
 * Browser connects via WebSocket to /api/gemini/voice-ws
 * Server relays to Vertex AI Live API using service account auth (ADC)
 * No API keys or prepayment credits needed.
 */

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");
const { GoogleAuth } = require("google-auth-library");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3003", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const VERTEX_PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production";
const VERTEX_LOCATION = "us-central1";
const VERTEX_WS_URL = `wss://${VERTEX_LOCATION}-aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

let cachedAuth = null;

async function getAccessToken() {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  const client = await cachedAuth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // WebSocket server for voice proxy
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "", true);

    if (pathname === "/api/gemini/voice-ws") {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        wss.emit("connection", clientWs, req);
      });
    } else {
      // Let Next.js handle other WebSocket upgrades (HMR in dev)
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs) => {
    console.log("[VoiceProxy] Browser client connected");

    let vertexWs = null;
    let isVertexReady = false;
    const pendingMessages = [];

    try {
      // Get fresh access token
      const accessToken = await getAccessToken();

      // Connect to Vertex AI Live API
      vertexWs = new WebSocket(VERTEX_WS_URL, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      vertexWs.on("open", () => {
        console.log("[VoiceProxy] Connected to Vertex AI");
        isVertexReady = true;

        // Flush pending messages
        for (const msg of pendingMessages) {
          vertexWs.send(msg);
        }
        pendingMessages.length = 0;
      });

      // Relay Vertex AI messages back to browser
      vertexWs.on("message", (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      });

      vertexWs.on("error", (err) => {
        console.error("[VoiceProxy] Vertex AI WS error:", err.message);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1011, "Vertex AI connection error");
        }
      });

      vertexWs.on("close", (code, reason) => {
        console.log(`[VoiceProxy] Vertex AI closed: ${code} ${reason?.toString()?.substring(0, 100)}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(code, reason?.toString()?.substring(0, 100));
        }
      });
    } catch (err) {
      console.error("[VoiceProxy] Failed to connect to Vertex AI:", err.message);
      clientWs.close(1011, "Failed to connect to Vertex AI");
      return;
    }

    // Relay browser messages to Vertex AI
    clientWs.on("message", (data) => {
      if (vertexWs) {
        if (isVertexReady && vertexWs.readyState === WebSocket.OPEN) {
          vertexWs.send(data);
        } else {
          pendingMessages.push(data);
        }
      }
    });

    clientWs.on("close", () => {
      console.log("[VoiceProxy] Browser client disconnected");
      if (vertexWs && vertexWs.readyState === WebSocket.OPEN) {
        vertexWs.close();
      }
    });

    clientWs.on("error", (err) => {
      console.error("[VoiceProxy] Browser WS error:", err.message);
      if (vertexWs && vertexWs.readyState === WebSocket.OPEN) {
        vertexWs.close();
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
