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

class TranscriberPipeline {
  static instance: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

  static async getInstance(progress_callback?: (info: ProgressInfo) => void): Promise<AutomaticSpeechRecognitionPipeline> {
    this.instance ??= pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
      dtype: 'fp16',
      device: await detectDevice(),
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
      self.postMessage({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load model',
      });
    }
  }

  if (type === 'transcribe') {
    try {
      const audio = event.data.audio;
      const language = event.data.language ?? 'en';
      const transcriber = await TranscriberPipeline.getInstance();
      const whisperLanguage = LANGUAGE_MAP[language] ?? 'english';

      if (!audio) {
        self.postMessage({ status: 'error', error: 'No audio data provided' });
        return;
      }

      const result = (await transcriber(audio, {
        language: whisperLanguage,
        task: 'transcribe',
      })) as AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[];

      const output = Array.isArray(result) ? result[0] : result;
      self.postMessage({ status: 'result', text: output.text.trim() });
    } catch (error: unknown) {
      self.postMessage({
        status: 'error',
        error: error instanceof Error ? error.message : 'Transcription failed',
      });
    }
  }
});
