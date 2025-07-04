import { FileDto, MessageDtoRatingEnum } from 'src/api';
import { ChatMessage } from '../../state/types';

export interface ChatItemProps {
  agentName: string;
  message: ChatMessage;
  isLast: boolean;
  isBeforeLast: boolean;
  rating?: MessageDtoRatingEnum;
  llmLogo?: string;
  selectDocument: (documentUri: string) => void;
  editMessage: (input: string, files?: FileDto[], editMessageId?: number) => void;
}
