import { MessageDto, SourceDto, StreamUIRequestDto } from 'src/api';

export interface ReasoningStep {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

type MessageMetaInfoState = {
  toolsInUse: Record<string, 'Started' | 'Completed'>;
  tokenCount?: number;
  debug: string[];
  sources: SourceDto[];
  logging: string[];
  reasoning: ReasoningStep[];
  error?: string;
  isAiWriting?: boolean;
  ui?: StreamUIRequestDto;
};

export type ChatMessage = MessageDto & Partial<MessageMetaInfoState>;
