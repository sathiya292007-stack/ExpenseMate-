/**
 * Convert a recorded audio Blob (webm/opus, mp4, etc.) into 16-bit PCM WAV
 * base64 so the ASR service can always decode it. Downmixes to mono.
 */
export async function blobToWavBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audio: AudioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const numFrames = audio.length;
    const sampleRate = audio.sampleRate;
    const channels = audio.numberOfChannels;

    // downmix to mono
    const mono = new Float32Array(numFrames);
    for (let ch = 0; ch < channels; ch++) {
      const data = audio.getChannelData(ch);
      for (let i = 0; i < numFrames; i++) mono[i] += data[i] / channels;
    }

    // encode 16-bit PCM WAV
    const bytesPerSample = 2;
    const blockAlign = bytesPerSample;
    const dataSize = numFrames * bytesPerSample;
    const bufferSize = 44 + dataSize;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, bufferSize - 8, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      const s = Math.max(-1, Math.min(1, mono[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    // ArrayBuffer -> base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  } finally {
    void ctx.close();
  }
}
