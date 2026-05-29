const https = require("https");
// we need an agent id and an api key
// but we just want to know if it 404s or 401s on PATCH
const options = {
  hostname: 'api.elevenlabs.io',
  path: '/v1/convai/agents/fake_agent_id',
  method: 'PATCH',
  headers: { 'xi-api-key': 'fake_key', 'Content-Type': 'application/json' }
};
const req = https.request(options, res => {
  console.log('Status:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
});
req.write(JSON.stringify({ conversation_config: { tts: { voice_id: "21m00Tcm4TlvDq8ikWAM" } } }));
req.end();
