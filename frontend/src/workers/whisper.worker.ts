import { env, pipeline } from '@huggingface/transformers';
import type {
  AutomaticSpeechRecognitionOutput,
  AutomaticSpeechRecognitionPipeline,
  ProgressInfo,
} from '@huggingface/transformers';

env.allowLocalModels = false;

const LANGUAGE_MAP: Record<string, string> = {
  de: 'german',
  en: 'english',
};

const SILENCE_RMS_THRESHOLD = 0.01;

const HALLUCINATION_PATTERNS: string[] = [
  // English
  'Thank you.',
  'Thank you for watching.',
  'Thanks for watching.',
  'Thank you for watching!',
  'Thanks for watching!',
  'Subtitles by',
  'Subtitles made by',
  'subtitles by the amara.org community',
  'Amara.org',
  '(music)',
  '(Music)',
  '(silence)',
  '(Silence)',
  'You',
  'you',
  'Bye.',
  'Bye!',
  'Goodbye.',
  // German
  'Untertitel',
  'Untertitel im Auftrag des ZDF',
  'Untertitel von',
  'Vielen Dank.',
  'Vielen Dank!',
  'Tschüss.',
  'SWR 2020',
  'SWR 2021',
];

function computeRMS(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

function isHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Exact match against known patterns (case-insensitive)
  if (HALLUCINATION_PATTERNS.some((p) => trimmed.toLowerCase() === p.toLowerCase())) {
    return true;
  }

  // Single punctuation or ellipsis
  if (/^[.!?,;:…]+$/.test(trimmed)) return true;

  // Repetitive pattern: same word/phrase repeated 3+ times
  const words = trimmed.split(/\s+/);
  if (words.length >= 3 && words.every((w) => w === words[0])) return true;

  return false;
}

class TranscriberPipeline {
  static instance: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

  static async getInstance(progress_callback?: (info: ProgressInfo) => void): Promise<AutomaticSpeechRecognitionPipeline> {
    const device = await detectDevice();
    this.instance ??= pipeline('automatic-speech-recognition', 'onnx-community/whisper-small', {
      dtype: 'q8',
      device,
      progress_callback,
    });
    return this.instance;
  }
}

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    if ('gpu' in navigator) {
      const adapter = await (navigator as Navigator & { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    }
  } catch {
    // WebGPU not available
  }
  return 'wasm';
}

interface WorkerMessageData {
  type: 'load' | 'transcribe';
  audio?: Float32Array;
  language?: string;
}

self.addEventListener('message', async (event: MessageEvent<WorkerMessageData>) => {
  const { type } = event.data;

  if (type === 'load') {
    try {
      await TranscriberPipeline.getInstance((info: ProgressInfo) => {
        self.postMessage(info);
      });
      self.postMessage({ status: 'ready' });
    } catch (error: unknown) {
      TranscriberPipeline.instance = null;

      const message = error instanceof Error ? error.message : 'Failed to load model';
      let code = 'download_failed';

      if (!navigator.onLine) {
        code = 'download_offline';
      } else if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
        code = 'download_timeout';
      }

      self.postMessage({ status: 'error', error: message, code });
    }
  }

  if (type === 'transcribe') {
    try {
      const audio = event.data.audio;
      const language = event.data.language ?? 'en';
      const transcriber = await TranscriberPipeline.getInstance();
      const whisperLanguage = LANGUAGE_MAP[language] ?? 'english';

      if (!audio) {
        self.postMessage({ status: 'error', error: 'No audio data provided', code: 'no_audio' });
        return;
      }

      // Layer 1: RMS energy check
      const rms = computeRMS(audio);
      if (rms < SILENCE_RMS_THRESHOLD) {
        self.postMessage({ status: 'silence' });
        return;
      }

      const result = (await transcriber(audio, {
        language: whisperLanguage,
        task: 'transcribe',
      })) as AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[];

      const output = Array.isArray(result) ? result[0] : result;
      const text = output.text.trim();

      // Layer 2: Hallucination filter
      if (isHallucination(text)) {
        self.postMessage({ status: 'silence' });
        return;
      }

      self.postMessage({ status: 'result', text });
    } catch (error: unknown) {
      self.postMessage({
        status: 'error',
        error: error instanceof Error ? error.message : 'Transcription failed',
        code: 'transcription_failed',
      });
    }
  }
});
