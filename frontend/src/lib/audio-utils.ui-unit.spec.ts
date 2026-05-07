import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock audio data
const mockChannelData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);

// Track constructor arguments
let capturedOfflineCtxArgs: unknown[] = [];

// Mock AudioBuffer
const mockRenderedBuffer = {
  getChannelData: vi.fn().mockReturnValue(mockChannelData),
};

// Mock source node
const mockSource = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
};

// Mock OfflineAudioContext
const mockOfflineCtx = {
  createBufferSource: vi.fn().mockReturnValue(mockSource),
  destination: {},
  startRendering: vi.fn().mockResolvedValue(mockRenderedBuffer),
};

// Mock AudioBuffer from decodeAudioData
const mockDecodedBuffer = {
  duration: 2.5,
  sampleRate: 44100,
  numberOfChannels: 2,
};

// Mock AudioContext
const mockAudioContextClose = vi.fn().mockResolvedValue(undefined);
const mockDecodeAudioData = vi.fn().mockResolvedValue(mockDecodedBuffer);

vi.stubGlobal(
  'AudioContext',
  class MockAudioContext {
    decodeAudioData = mockDecodeAudioData;
    close = mockAudioContextClose;
  },
);

vi.stubGlobal(
  'OfflineAudioContext',
  class MockOfflineAudioContext {
    createBufferSource = mockOfflineCtx.createBufferSource;
    destination = mockOfflineCtx.destination;
    startRendering = mockOfflineCtx.startRendering;

    constructor(...args: unknown[]) {
      capturedOfflineCtxArgs = args;
    }
  },
);

// Helper: create a mock Blob with arrayBuffer() support (jsdom Blob lacks it)
function createMockBlob(): Blob {
  const blob = new Blob(['test-audio-data'], { type: 'audio/webm' });
  // jsdom Blob does not implement arrayBuffer(), so we polyfill it
  if (!blob.arrayBuffer) {
    blob.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8));
  }
  return blob;
}

describe('resampleToMono16kHz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOfflineCtxArgs = [];
    mockDecodeAudioData.mockResolvedValue(mockDecodedBuffer);
    mockOfflineCtx.startRendering.mockResolvedValue(mockRenderedBuffer);
    mockRenderedBuffer.getChannelData.mockReturnValue(mockChannelData);
    mockAudioContextClose.mockResolvedValue(undefined);
  });

  it('returns a Float32Array', async () => {
    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    const result = await resampleToMono16kHz(blob);

    expect(result).toBeInstanceOf(Float32Array);
  });

  it('creates OfflineAudioContext with 1 channel, correct sample count, and 16000 Hz', async () => {
    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    await resampleToMono16kHz(blob);

    // numSamples = Math.ceil(2.5 * 16000) = 40000
    expect(capturedOfflineCtxArgs).toEqual([1, 40000, 16000]);
  });

  it('computes numSamples as ceil(duration * 16000)', async () => {
    // Set a duration that requires ceiling
    mockDecodeAudioData.mockResolvedValue({
      ...mockDecodedBuffer,
      duration: 1.00001,
    });

    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    await resampleToMono16kHz(blob);

    // numSamples = Math.ceil(1.00001 * 16000) = Math.ceil(16000.16) = 16001
    expect(capturedOfflineCtxArgs[1]).toBe(Math.ceil(1.00001 * 16000));
  });

  it('calls AudioContext.close() in finally block even after success', async () => {
    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    await resampleToMono16kHz(blob);

    expect(mockAudioContextClose).toHaveBeenCalledTimes(1);
  });

  it('calls AudioContext.close() in finally block even after error', async () => {
    mockDecodeAudioData.mockRejectedValue(new Error('Decode failed'));

    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    await expect(resampleToMono16kHz(blob)).rejects.toThrow('Decode failed');
    expect(mockAudioContextClose).toHaveBeenCalledTimes(1);
  });

  it('returns a slice copy, not a reference to the rendered buffer channel data', async () => {
    const originalData = new Float32Array([1.0, 2.0, 3.0]);
    mockRenderedBuffer.getChannelData.mockReturnValue(originalData);

    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    const result = await resampleToMono16kHz(blob);

    // Should be a different Float32Array instance (via .slice())
    expect(result).not.toBe(originalData);
    // But same values
    expect(Array.from(result)).toEqual(Array.from(originalData));
  });

  it('connects source to destination and starts playback', async () => {
    const { resampleToMono16kHz } = await import('./audio-utils');
    const blob = createMockBlob();

    await resampleToMono16kHz(blob);

    expect(mockSource.connect).toHaveBeenCalled();
    expect(mockSource.start).toHaveBeenCalledWith(0);
  });
});
