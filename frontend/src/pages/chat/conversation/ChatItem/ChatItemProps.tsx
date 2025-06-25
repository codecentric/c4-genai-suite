import { FileDto, MessageDtoRatingEnum, ProfileDto } from 'src/api';
import { ChatMessage } from '../../state';

export interface ChatItemProps {
  agentName: string;
  message: ChatMessage;
  isLast: boolean;
  isBeforeLast: boolean;
  isWriting?: boolean;
  conversationId: number;
  rating?: MessageDtoRatingEnum;
  user: ProfileDto;
  llmLogo?: string;
  selectDocument: (documentUri: string) => void;
  onSubmit: (input: string, files?: FileDto[], editMessageId?: number) => void;
}
