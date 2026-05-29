export async function playElevenLabsAudio(text: string, apiKey: string): Promise<void> {
  // Clean markdown from the text (remove **, *, #, -, etc)
  // This ensures the voice doesn't read out "asterisk asterisk"
  const cleanText = text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')    // italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // links
    .replace(/#+\s+(.*)/g, '$1')        // headers
    .replace(/```[\s\S]*?```/g, 'Code block omitted for voice.') // code blocks
    .replace(/`([^`]+)`/g, '$1')        // inline code
    .replace(/[-*]\s+/g, '')            // lists
    .replace(/>\s+(.*)/g, '$1');        // blockquotes

  // Default to Rachel voice for now
  const voiceId = "21m00Tcm4TlvDq8ikWAM";
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: "eleven_turbo_v2_5", // Using the fast turbo model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (e) => reject(e);
    audio.play().catch(reject);
  });
}
