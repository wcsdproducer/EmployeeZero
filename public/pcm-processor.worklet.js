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
