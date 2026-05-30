import { NextResponse } from "next/server";

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      // Send the Float32Array of the first audio channel (monophonic)
      this.port.postMessage(input[0]);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

export async function GET() {
  return new NextResponse(WORKLET_CODE, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
