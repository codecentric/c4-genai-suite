import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockTranscriber = vi.fn();
const mockPipeline = vi.fn().mockResolvedValue(mockTranscriber);

vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: { allowLocalModels: false },
}));

// Helper to import the worker module and extract the message handler
async function importWorkerAndGetHandler(
  addEventListenerSpy: ReturnType<typeof vi.fn>,
): Promise<(event: MessageEvent) => Promise<void>> {
  // eslint-disable-next-line import/extensions
  await import('./whisper.worker');

  const call = addEventListenerSpy.mock.calls.find((args: unknown[]) => args[0] === 'message') as
    | [string, (event: MessageEvent) => Promise<void>]
    | undefined;
  expect(call).toBeDefined();
  return call![1];
}

describe('whisper.worker', () => {
  let messageHandler: (event: MessageEvent) => Promise<void>;
  const mockPostMessage = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPipeline.mockResolvedValue(mockTranscriber);

    // Reset the singleton by re-importing the module
    vi.resetModules();

    // Stub self.postMessage before importing the worker module
    // In jsdom, self === window, and window.postMessage requires 2 args
    vi.stubGlobal('postMessage', mockPostMessage);

    // Capture the message handler registered via self.addEventListener
    const addEventListenerSpy = vi.fn();
    vi.stubGlobal('addEventListener', addEventListenerSpy);

    // Stub navigator without gpu by default (WASM fallback)
    vi.stubGlobal('navigator', {});

    messageHandler = await importWorkerAndGetHandler(addEventListenerSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('singleton pipeline', () => {
    it('returns the same promise instance when getInstance is called twice', async () => {
      // First load initializes the pipeline
      const event1 = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(event1);

      vi.clearAllMocks();

      // Second load should reuse the existing pipeline instance
      const event2 = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(event2);

      // pipeline() should NOT be called again for the second load
      expect(mockPipeline).not.toHaveBeenCalled();
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'ready' });
    });
  });

  describe('device detection', () => {
    it('returns webgpu when navigator.gpu.requestAdapter resolves to an adapter', async () => {
      const mockAdapter = { features: new Set() };
      vi.stubGlobal('navigator', {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
        },
      });

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPipeline).toHaveBeenCalledWith(
        'automatic-speech-recognition',
        'onnx-community/whisper-small',
        expect.objectContaining({ device: 'webgpu' }),
      );
    });

    it('returns wasm when navigator.gpu is undefined', async () => {
      const event = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(event);

      expect(mockPipeline).toHaveBeenCalledWith(
        'automatic-speech-recognition',
        'onnx-community/whisper-small',
        expect.objectContaining({ device: 'wasm' }),
      );
    });

    it('returns wasm when requestAdapter returns null', async () => {
      vi.stubGlobal('navigator', {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue(null),
        },
      });

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPipeline).toHaveBeenCalledWith(
        'automatic-speech-recognition',
        'onnx-community/whisper-small',
        expect.objectContaining({ device: 'wasm' }),
      );
    });
  });

  describe('language mapping', () => {
    it('maps de to german', async () => {
      mockTranscriber.mockResolvedValue({ text: 'Hallo Welt' });

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      vi.clearAllMocks();

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1, 0.2]),
          language: 'de',
        },
      });
      await messageHandler(event);

      expect(mockTranscriber).toHaveBeenCalledWith(expect.any(Float32Array), expect.objectContaining({ language: 'german' }));
    });

    it('maps en to english', async () => {
      mockTranscriber.mockResolvedValue({ text: 'Hello World' });

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      vi.clearAllMocks();

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1, 0.2]),
          language: 'en',
        },
      });
      await messageHandler(event);

      expect(mockTranscriber).toHaveBeenCalledWith(expect.any(Float32Array), expect.objectContaining({ language: 'english' }));
    });

    it('falls back to english for unknown language codes', async () => {
      mockTranscriber.mockResolvedValue({ text: 'Bonjour' });

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      vi.clearAllMocks();

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1, 0.2]),
          language: 'fr',
        },
      });
      await messageHandler(event);

      expect(mockTranscriber).toHaveBeenCalledWith(expect.any(Float32Array), expect.objectContaining({ language: 'english' }));
    });
  });

  describe('load message', () => {
    it('posts ready status after successful model load', async () => {
      const event = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'ready' });
    });

    it('passes progress_callback that forwards ProgressInfo via postMessage', async () => {
      let capturedCallback: ((info: unknown) => void) | undefined;
      mockPipeline.mockImplementation(
        (_task: string, _model: string, options: { progress_callback?: (info: unknown) => void }) => {
          capturedCallback = options?.progress_callback;
          return Promise.resolve(mockTranscriber);
        },
      );

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(capturedCallback).toBeDefined();

      const progressInfo = {
        status: 'progress',
        name: 'model',
        file: 'model.onnx',
        progress: 50,
        loaded: 50000,
        total: 100000,
      };
      capturedCallback!(progressInfo);

      expect(mockPostMessage).toHaveBeenCalledWith(progressInfo);
    });
  });

  describe('transcribe message', () => {
    it('posts result with trimmed text', async () => {
      mockTranscriber.mockResolvedValue({ text: '  Hello World  ' });

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      vi.clearAllMocks();

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1, 0.2, 0.3]),
          language: 'en',
        },
      });
      await messageHandler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'result',
        text: 'Hello World',
      });
    });

    it('calls transcriber with task transcribe', async () => {
      mockTranscriber.mockResolvedValue({ text: 'test' });

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      vi.clearAllMocks();

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1]),
          language: 'en',
        },
      });
      await messageHandler(event);

      expect(mockTranscriber).toHaveBeenCalledWith(expect.any(Float32Array), expect.objectContaining({ task: 'transcribe' }));
    });

    it('handles array result from transcriber', async () => {
      mockTranscriber.mockResolvedValue([{ text: ' Array result ' }]);

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      vi.clearAllMocks();

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1]),
          language: 'en',
        },
      });
      await messageHandler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'result',
        text: 'Array result',
      });
    });
  });

  describe('error handling', () => {
    it('posts error status with download_failed code when pipeline load fails', async () => {
      mockPipeline.mockRejectedValue(new Error('Network error'));

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);
      vi.stubGlobal('navigator', { onLine: true });

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'Network error',
        code: 'download_failed',
      });
    });

    it('posts error status with transcription_failed code when transcription fails', async () => {
      // First load successfully
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);

      // Then make transcriber throw
      mockTranscriber.mockRejectedValue(new Error('Inference failed'));

      const event = new MessageEvent('message', {
        data: {
          type: 'transcribe',
          audio: new Float32Array([0.1]),
          language: 'en',
        },
      });
      await messageHandler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'Inference failed',
        code: 'transcription_failed',
      });
    });

    it('posts download_offline error code when navigator.onLine is false', async () => {
      mockPipeline.mockRejectedValue(new Error('Failed to fetch'));

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);
      vi.stubGlobal('navigator', { onLine: false });

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'Failed to fetch',
        code: 'download_offline',
      });
    });

    it('posts download_timeout error code when error message contains timeout', async () => {
      mockPipeline.mockRejectedValue(new Error('Request timeout exceeded'));

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);
      vi.stubGlobal('navigator', { onLine: true });

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'Request timeout exceeded',
        code: 'download_timeout',
      });
    });

    it('posts download_failed error code for generic errors when online', async () => {
      mockPipeline.mockRejectedValue(new Error('Some other error'));

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);
      vi.stubGlobal('navigator', { onLine: true });

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'Some other error',
        code: 'download_failed',
      });
    });

    it('resets TranscriberPipeline.instance on load failure to allow retry', async () => {
      // First attempt fails
      mockPipeline.mockRejectedValueOnce(new Error('Network error'));

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);
      vi.stubGlobal('navigator', { onLine: true });

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await handler(loadEvent);

      expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', code: 'download_failed' }));

      // Second attempt should succeed (pipeline called again, not returning cached rejected promise)
      mockPipeline.mockResolvedValue(mockTranscriber);
      mockPostMessage.mockClear();

      await handler(loadEvent);

      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'ready' });
    });

    it('posts no_audio error code when audio data is missing', async () => {
      // Load model first
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);

      mockPostMessage.mockClear();

      // Send transcribe without audio
      const event = new MessageEvent('message', {
        data: { type: 'transcribe', language: 'en' },
      });
      await messageHandler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'No audio data provided',
        code: 'no_audio',
      });
    });
  });

  describe('silence detection', () => {
    it('should return silence status when audio RMS is below threshold', async () => {
      // Load model first
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      // Create a Float32Array with very low values (silence)
      const silentAudio = new Float32Array(16000).fill(0.0001);
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: silentAudio, language: 'en' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'silence' });
    });

    it('should proceed to transcription when audio RMS is above threshold', async () => {
      // Load model first
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      // Create audio with sufficient energy
      const loudAudio = new Float32Array(16000);
      for (let i = 0; i < loudAudio.length; i++) {
        loudAudio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000);
      }
      mockTranscriber.mockResolvedValue({ text: 'Hello world' });
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: loudAudio, language: 'en' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'result', text: 'Hello world' });
    });

    it('should return silence status for known hallucination "Thank you."', async () => {
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      const loudAudio = new Float32Array(16000);
      for (let i = 0; i < loudAudio.length; i++) {
        loudAudio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000);
      }
      mockTranscriber.mockResolvedValue({ text: 'Thank you.' });
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: loudAudio, language: 'en' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'silence' });
    });

    it('should return silence status for German hallucination "Untertitel"', async () => {
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      const loudAudio = new Float32Array(16000);
      for (let i = 0; i < loudAudio.length; i++) {
        loudAudio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000);
      }
      mockTranscriber.mockResolvedValue({ text: 'Untertitel' });
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: loudAudio, language: 'de' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'silence' });
    });

    it('should return silence status for punctuation-only text', async () => {
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      const loudAudio = new Float32Array(16000);
      for (let i = 0; i < loudAudio.length; i++) {
        loudAudio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000);
      }
      mockTranscriber.mockResolvedValue({ text: '...' });
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: loudAudio, language: 'en' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'silence' });
    });

    it('should return silence status for repetitive text', async () => {
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      const loudAudio = new Float32Array(16000);
      for (let i = 0; i < loudAudio.length; i++) {
        loudAudio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000);
      }
      mockTranscriber.mockResolvedValue({ text: 'the the the' });
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: loudAudio, language: 'en' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'silence' });
    });

    it('should NOT filter legitimate short text like "Hello"', async () => {
      const loadEvent = new MessageEvent('message', { data: { type: 'load' } });
      await messageHandler(loadEvent);
      mockPostMessage.mockClear();

      const loudAudio = new Float32Array(16000);
      for (let i = 0; i < loudAudio.length; i++) {
        loudAudio[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 16000);
      }
      mockTranscriber.mockResolvedValue({ text: 'Hello' });
      await messageHandler(new MessageEvent('message', { data: { type: 'transcribe', audio: loudAudio, language: 'en' } }));
      expect(mockPostMessage).toHaveBeenCalledWith({ status: 'result', text: 'Hello' });
    });
  });
});
