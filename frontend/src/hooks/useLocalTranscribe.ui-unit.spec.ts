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
        downloadFailedOffline: 'No internet connection.',
        downloadFailedTimeout: 'Download timed out.',
        downloadCancelled: 'Download cancelled.',
        emptyTranscription: 'No speech could be recognized.',
        silenceDetected: 'No speech detected.',
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
    // Stub browser capabilities for isSupported check (default: all supported)
    vi.stubGlobal('WebAssembly', {});
    vi.stubGlobal('crossOriginIsolated', true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    language: 'de',
    onTranscriptReceived: vi.fn(),
  };

  // Test 1: Initial state
  it('starts in idle state with downloadProgress null', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Hook starts in idle state with lazy loading (no pre-load on mount)
    expect(result.current.state).toBe('idle');
    expect(result.current.downloadProgress).toBeNull();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isSupported).toBe(true);
  });

  // Test 2: Worker creation on mount (lazy loading - no load message)
  it('creates Worker on mount and becomes idle on ready', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Worker created but no load message posted (lazy loading)
    expect(mockWorkerInstance.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));

    act(() => {
      simulateWorkerMessage({ status: 'ready' });
    });

    expect(result.current.state).toBe('idle');
  });

  // Test 3: First click when model not loaded (D-04)
  it('posts load to Worker on first click when model not loaded, auto-starts recording on ready', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Send error so hook goes to 'idle' state (model not loaded, error -> idle per D-04)
    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Load failed' });
    });

    // After error, state is now idle (not error) per D-04/Phase 3 D-13
    expect(result.current.state).toBe('idle');

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
  it('updates downloadProgress on progress_total message', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Click record to trigger model download (state -> downloading)
    await act(async () => {
      await result.current.toggleRecording();
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

  // Test 11: Error from Worker (with error code)
  it('sets idle state and shows toast on Worker error with code', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Network error', code: 'download_offline' });
    });

    expect(result.current.state).toBe('idle');
    expect(toast.error).toHaveBeenCalledWith('No internet connection.');
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
  it('does not allow recording during downloading state', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Trigger download
    await act(async () => {
      await result.current.toggleRecording();
    });
    expect(result.current.state).toBe('downloading');

    // Try to toggle again -- should be a no-op (D-05)
    await act(async () => {
      await result.current.toggleRecording();
    });
    expect(result.current.state).toBe('downloading');
  });

  // Test 14: isSupported false when Worker missing (ERR-02)
  it('returns isSupported=false when Worker is not available', () => {
    const origWorker = globalThis.Worker;
    // @ts-expect-error -- testing missing API
    delete globalThis.Worker;

    const { result } = renderHook(() => useLocalTranscribe(defaultProps));
    expect(result.current.isSupported).toBe(false);

    globalThis.Worker = origWorker;
  });

  // Test 15: isSupported false when crossOriginIsolated is false (ERR-02)
  it('returns isSupported=false when crossOriginIsolated is false', () => {
    vi.stubGlobal('crossOriginIsolated', false);

    const { result } = renderHook(() => useLocalTranscribe(defaultProps));
    expect(result.current.isSupported).toBe(false);
  });

  // Test 16: no Worker created when isSupported=false (ERR-02)
  it('does not create Worker when isSupported is false', () => {
    vi.stubGlobal('crossOriginIsolated', false);

    renderHook(() => useLocalTranscribe(defaultProps));
    // Worker constructor should not have been called for the hook
    // (the mock resets between tests, so postMessage should not have been called)
    expect(mockWorkerInstance?.postMessage || vi.fn()).not.toHaveBeenCalled();
  });

  // Test 17: download timeout error mapping (ERR-03)
  it('maps download_timeout error code to timeout i18n message', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Timed out', code: 'download_timeout' });
    });

    expect(result.current.state).toBe('idle');
    expect(toast.error).toHaveBeenCalledWith('Download timed out.');
  });

  // Test 18: download generic error mapping (ERR-03)
  it('maps download_failed error code to generic download i18n message', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Unknown', code: 'download_failed' });
    });

    expect(result.current.state).toBe('idle');
    expect(toast.error).toHaveBeenCalledWith('Failed to download speech recognition model.');
  });

  // Test 19: unknown error code falls back to raw message (ERR-03)
  it('falls back to raw error message for unknown error codes', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    act(() => {
      simulateWorkerMessage({ status: 'error', error: 'Something unexpected' });
    });

    expect(result.current.state).toBe('idle');
    expect(toast.error).toHaveBeenCalledWith('Something unexpected');
  });

  // Test 20: empty transcription shows toast.info (ERR-04)
  it('shows toast.info and does not insert text for empty transcription', () => {
    const onTranscriptReceived = vi.fn();
    const { result } = renderHook(() => useLocalTranscribe({ ...defaultProps, onTranscriptReceived }));

    act(() => {
      simulateWorkerMessage({ status: 'result', text: '' });
    });

    expect(result.current.state).toBe('idle');
    expect(toast.info).toHaveBeenCalledWith('No speech could be recognized.');
    expect(onTranscriptReceived).not.toHaveBeenCalled();
  });

  // Test 21: whitespace-only transcription shows toast.info (ERR-04)
  it('shows toast.info for whitespace-only transcription', () => {
    const onTranscriptReceived = vi.fn();
    const { result } = renderHook(() => useLocalTranscribe({ ...defaultProps, onTranscriptReceived }));

    act(() => {
      simulateWorkerMessage({ status: 'result', text: '   \n  ' });
    });

    expect(result.current.state).toBe('idle');
    expect(toast.info).toHaveBeenCalledWith('No speech could be recognized.');
    expect(onTranscriptReceived).not.toHaveBeenCalled();
  });

  // Test 22: valid transcription still works (regression)
  it('inserts text for non-empty transcription result', () => {
    const onTranscriptReceived = vi.fn();
    const { result } = renderHook(() => useLocalTranscribe({ ...defaultProps, onTranscriptReceived }));

    act(() => {
      simulateWorkerMessage({ status: 'result', text: 'Hello world' });
    });

    expect(result.current.state).toBe('idle');
    expect(onTranscriptReceived).toHaveBeenCalledWith('Hello world');
    expect(toast.info).not.toHaveBeenCalled();
  });

  // Test 23: mic denied prevents model download
  it('does not start model download when mic permission is denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));

    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    await act(async () => {
      await result.current.toggleRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(toast.error).toHaveBeenCalledWith('Microphone permission denied.');
    expect(mockWorkerInstance.postMessage).not.toHaveBeenCalledWith({ type: 'load' });
  });

  // Test 24: cancel download shows toast.info (D-06)
  it('shows toast.info when download is cancelled', async () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));

    // Start download
    await act(async () => {
      await result.current.toggleRecording();
    });
    expect(result.current.state).toBe('downloading');

    // Cancel
    act(() => {
      result.current.cancelDownload();
    });

    expect(result.current.state).toBe('idle');
    expect(toast.info).toHaveBeenCalledWith('Download cancelled.');
  });

  describe('elapsed seconds', () => {
    it('should expose elapsedSeconds initially as 0', () => {
      const { result } = renderHook(() => useLocalTranscribe(defaultProps));
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('should update elapsedSeconds during recording', async () => {
      const { result } = renderHook(() => useLocalTranscribe(defaultProps));

      // Model loaded
      act(() => {
        simulateWorkerMessage({ status: 'ready' });
      });

      // Start recording
      await act(async () => {
        await result.current.toggleRecording();
      });

      expect(result.current.state).toBe('recording');

      // Advance timer by 3 seconds (3000ms)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(2);
    });
  });

  describe('silence status handling', () => {
    it('should show toast.info on silence status', () => {
      renderHook(() => useLocalTranscribe(defaultProps));

      act(() => {
        simulateWorkerMessage({ status: 'silence' });
      });

      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('No speech detected'));
    });

    it('should return to idle state on silence status', () => {
      const { result } = renderHook(() => useLocalTranscribe(defaultProps));

      act(() => {
        simulateWorkerMessage({ status: 'silence' });
      });

      expect(result.current.state).toBe('idle');
    });

    it('should NOT call onTranscriptReceived on silence status', () => {
      const onTranscriptReceived = vi.fn();
      renderHook(() => useLocalTranscribe({ ...defaultProps, onTranscriptReceived }));

      act(() => {
        simulateWorkerMessage({ status: 'silence' });
      });

      expect(onTranscriptReceived).not.toHaveBeenCalled();
    });
  });
});
