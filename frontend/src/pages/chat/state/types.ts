import { MessageDto, SourceDto, StreamUIRequestDto } from 'src/api';

type MessageMetaInfoState = {
  toolsInUse: Record<string, 'Started' | 'Completed'>;
  tokenCount?: number;
  debug: string[];
  sources: SourceDto[];
  logging: string[];
  reasoning: string;
  reasoningInProgress: boolean;
  error?: string;
  isAiWriting?: boolean;
  ui?: StreamUIRequestDto;
};

export type ChatMessage = MessageDto & Partial<MessageMetaInfoState>;
