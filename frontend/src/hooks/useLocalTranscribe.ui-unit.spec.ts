import { act, renderHook } from '@testing-library/react';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resampleToMono16kHz } from 'src/lib/audio-utils';

// Mock audio-utils
vi.mock('src/lib/audio-utils', () => ({
  resampleToMono16kHz: vi.fn().mockResolvedValue(new Float32Array(16000)),
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), info: vi.fn() },
}));

// Mock texts
vi.mock('src/texts', () => ({
  texts: {
    chat: {
      localTranscribe: {
        maxDurationReached: 'Maximum recording duration reached. Transcribing audio...',
        microphonePermissionDenied: 'Microphone permission denied.',
        recordingStartFailed: 'Failed to start recording.',
        noAudioRecorded: 'No audio was recorded.',
        transcriptionFailed: 'Local transcription failed.',
        downloadFailed: 'Failed to download speech recognition model.',
        loadFailed: 'Failed to load speech recognition model.',
      },
    },
  },
}));

// --- Worker mock infrastructure ---
interface MockWorker {
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  messageHandler: ((event: MessageEvent) => void) | null;
}

let mockWorkerInstance: MockWorker;

function simulateWorkerMessage(data: Record<string, unknown>) {
  if (mockWorkerInstance.messageHandler) {
    mockWorkerInstance.messageHandler({ data } as MessageEvent);
  }
}

// Worker class mock -- each instance IS the mockWorkerInstance
class MockWorkerClass {
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;

  constructor() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.removeEventListener = vi.fn();
    this.addEventListener = vi.fn((event: string, handler: (event: MessageEvent) => void) => {
      if (event === 'message') {
        mockWorkerInstance.messageHandler = handler;
      }
    });
    // Point the global reference to this instance
    mockWorkerInstance = {
      postMessage: this.postMessage,
      addEventListener: this.addEventListener,
      removeEventListener: this.removeEventListener,
      terminate: this.terminate,
      messageHandler: null,
    };
  }
}

vi.stubGlobal('Worker', MockWorkerClass);

// --- MediaRecorder mock infrastructure ---
interface MockMediaRecorder {
  state: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  requestData: ReturnType<typeof vi.fn>;
}

let mockMediaRecorderInstance: MockMediaRecorder;

class MockMediaRecorderClass {
  state: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  requestData: ReturnType<typeof vi.fn>;

  constructor() {
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;

    // Point global reference to this instance FIRST so mockImplementation closures capture it
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockMediaRecorderInstance = this;

    this.start = vi.fn().mockImplementation(() => {
      mockMediaRecorderInstance.state = 'recording';
    });
    this.stop = vi.fn().mockImplementation(() => {
      mockMediaRecorderInstance.state = 'inactive';
      if (mockMediaRecorderInstance.onstop) {
        mockMediaRecorderInstance.onstop();
      }
    });
    this.requestData = vi.fn();
  }
}

vi.stubGlobal('MediaRecorder', MockMediaRecorderClass);

// --- Mock stream ---
const mockTrackStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: mockTrackStop }],
};

// Override navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
});

// Import the hook after mocks are set up
import { useLocalTranscribe } from './useLocalTranscribe';

// Helper to simulate audio data arriving on the MediaRecorder
function simulateAudioData() {
  if (mockMediaRecorderInstance.ondataavailable) {
    mockMediaRecorderInstance.ondataavailable({ data: new Blob(['audio'], { type: 'audio/webm' }) });
  }
}

describe('useLocalTranscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    language: 'de',
    onTranscriptReceived: vi.fn(),
  };

  // Test 1: Initial state
  it('starts in loading state with downloadProgress null', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // On mount, the hook sends 'load' to Worker (pre-load D-06), setting state to 'loading'
    expect(result.current.state).toBe('loading');
    expect(result.current.downloadProgress).toBeNull();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.isDownloading).toBe(false);
  });

  // Test 2: Model pre-load on mount (D-06)
  it('creates Worker and posts load on mount, becomes idle on ready', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Worker should be created and load message posted
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'load' });

    // Simulate model ready
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    expect(result.current.state).toBe('idle');
  });

  // Test 3: First click when model not loaded (D-04)
  it('posts load to Worker on first click when model not loaded, auto-starts recording on ready', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Send error so hook goes to 'error' state (model not loaded)
    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Load failed' });
    });

    expect(result.current.state).toBe('error');

    // Now click toggleRecording -- model is not loaded, should set pending and post 'load'
    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(result.current.state).toBe('downloading');
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'load' });

    // Simulate ready -- should auto-start recording (beginRecording is async, needs async act)
    await act(async () => {
      simulateWorkerMessage({ status: 'ready' });
      // Allow microtask (getUserMedia promise) to settle
      await vi.waitFor(() => undefined);
    });

    expect(result.current.state).toBe('recording');
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  // Test 4: Click when model already loaded
  it('goes directly to recording state when model already loaded', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Model loaded
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });
    expect(result.current.state).toBe('idle');

    // Click record
    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(result.current.state).toBe('recording');
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  // Test 5: Download progress (D-08)
  it('updates downloadProgress on progress_total message', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // During initial load, if download events arrive, transition to downloading
    act(() => {
      simulateWorkerMessage({ status: 'download', name: 'model', file: 'encoder.onnx' });
    });

    expect(result.current.state).toBe('downloading');

    act(() => {
      simulateWorkerMessage({ status: 'progress_total', name: 'model', progress: 50, loaded: 50, total: 100 });
    });

    expect(result.current.downloadProgress).toEqual({
      loaded: 50,
      total: 100,
      percentage: 50,
    });
  });

  // Test 6: Stop recording + transcribe
  it('stops recording, resamples audio, and posts transcribe to Worker', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Load model
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    // Start recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    // Simulate audio data via the hook's ondataavailable handler (set on the instance)
    act(() => {
      simulateAudioData();
    });

    // Stop recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    // Should have called resampleToMono16kHz
    expect(resampleToMono16kHz).toHaveBeenCalled();

    // Should have posted transcribe message to Worker
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transcribe',
        language: 'de',
      }),
      expect.any(Array),
    );

    expect(result.current.state).toBe('transcribing');
  });

  // Test 7: Transcription result (D-10)
  it('calls onTranscriptReceived and sets idle on result', async () => {
    const onTranscriptReceived = vi.fn();
    const { result } = renderHook(() => useLocalTranscribe({ ...defaultProps, onTranscriptReceived }));

    // Load model
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    // Start recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    // Simulate audio
    act(() => {
      simulateAudioData();
    });

    // Stop recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    // Simulate result from Worker
    act(() => {
      simulateWorkerMessage({ status: 'result', text: 'hello world' });
    });

    expect(onTranscriptReceived).toHaveBeenCalledWith('hello world');
    expect(result.current.state).toBe('idle');
  });

  // Test 8: Auto-stop at 2 minutes (D-11)
  it('auto-stops recording after maxDurationMs and shows toast', async () => {
    const { result } = renderHook(() => useLocalTranscribe({ ...defaultProps, maxDurationMs: 120000 }));

    // Load model
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    // Start recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(result.current.state).toBe('recording');

    // Simulate audio data before auto-stop
    act(() => {
      simulateAudioData();
    });

    // Advance time past 2 minutes
    act(() => {
      vi.advanceTimersByTime(120100);
    });

    expect(toast.info).toHaveBeenCalledWith('Maximum recording duration reached. Transcribing audio...');
  });

  // Test 9: Transferable transfer (AUDIO-03)
  it('posts transcribe message with Transferable transfer list', async () => {
    const mockAudioData = new Float32Array(16000);
    vi.mocked(resampleToMono16kHz).mockResolvedValue(mockAudioData);

    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Load model
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    // Start recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    // Simulate audio
    act(() => {
      simulateAudioData();
    });

    // Stop recording
    await act(async () => {
      await result.current.toggleRecording();
    });

    // Find the transcribe call
    const transcribeCall = mockWorkerInstance.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'transcribe',
    );
    expect(transcribeCall).toBeDefined();
    // Second argument should be the transfer list with the ArrayBuffer
    expect(transcribeCall![1]).toEqual([mockAudioData.buffer]);
  });

  // Test 10: Language parameter (D-09)
  it('passes language parameter to Worker transcribe message', async () => {
    const { result } = renderHook(() => useLocalTranscribe({ ...defaultProps, language: 'en' }));

    // Load model
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    // Record and stop
    await act(async () => {
      await result.current.toggleRecording();
    });

    act(() => {
      simulateAudioData();
    });

    await act(async () => {
      await result.current.toggleRecording();
    });

    const transcribeCall = mockWorkerInstance.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).type === 'transcribe',
    );
    expect(transcribeCall).toBeDefined();
    expect((transcribeCall![0] as Record<string, unknown>).language).toBe('en');
  });

  // Test 11: Error from Worker
  it('sets error state and shows toast on Worker error', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Something went wrong' });
    });

    expect(result.current.state).toBe('error');
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });

  // Test 12: Cleanup on unmount
  it('terminates Worker and cleans up on unmount', () => {
    const { unmount } = renderHook(() => useLocalTranscribe(defaultProps));

    // Load model
    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    unmount();

    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
    expect(mockWorkerInstance.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  // Test 13: Download blocks recording (D-05)
  it('does not allow recording during downloading or loading states', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Hook is in 'loading' state on mount
    expect(result.current.state).toBe('loading');

    // Try to toggle recording -- should be a no-op
    await act(async () => {
      await result.current.toggleRecording();
    });

    // State should still be loading (not recording)
    expect(result.current.state).toBe('loading');
    expect(mockGetUserMedia).not.toHaveBeenCalled();
  });
});
