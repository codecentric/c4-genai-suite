import { MessageDto, SourceDto, StreamUIRequestDto } from 'src/api';

type MessageMetaInfoState = {
  toolsInUse: Record<string, 'Started' | 'Completed'>;
  tokenCount?: number;
  debug: string[];
  sources: SourceDto[];
  logging: string[];
  error?: string;
  isAiWriting?: boolean;
  ui?: StreamUIRequestDto;
  thinking?: string;
  isThinking?: boolean;
};

export type ChatMessage = MessageDto & Partial<MessageMetaInfoState>;
