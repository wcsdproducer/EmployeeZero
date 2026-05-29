const https = require("https");
const data = JSON.stringify({
  conversation_config: {
    agent: {
      prompt: { prompt: "You are an AI." },
      first_message: "Hi",
      tools: [
        {
          type: "client",
          name: "search_memories",
          description: "Searches memories",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" }
            },
            required: ["query"]
          }
        }
      ]
    }
  }
});

const req = https.request({
  hostname: 'api.elevenlabs.io',
  path: '/v1/convai/agents/create',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  console.log('Status:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
});
req.write(data);
req.end();
