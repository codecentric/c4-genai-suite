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
    it('posts error status when pipeline load fails', async () => {
      mockPipeline.mockRejectedValue(new Error('Network error'));

      vi.resetModules();
      const addEventListenerSpy = vi.fn();
      vi.stubGlobal('addEventListener', addEventListenerSpy);

      const handler = await importWorkerAndGetHandler(addEventListenerSpy);

      const event = new MessageEvent('message', { data: { type: 'load' } });
      await handler(event);

      expect(mockPostMessage).toHaveBeenCalledWith({
        status: 'error',
        error: 'Network error',
      });
    });

    it('posts error status when transcription fails', async () => {
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
      });
    });
  });
});
