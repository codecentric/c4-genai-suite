/** Resamples an audio Blob to 16kHz mono Float32Array for Whisper inference. */
export async function resampleToMono16kHz(audioBlob: Blob): Promise<Float32Array> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

    const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer.getChannelData(0).slice();
  } finally {
    await audioContext.close();
  }
}
