import { FileDto, MessageDtoRatingEnum } from 'src/api';
import { ChatMessage } from '../../state/types';
import { AIChatItem } from './AIChatItem';
import { HumanChatItem } from './HumanChatItem';

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

export const ChatItem = (props: ChatItemProps) => {
  return props.message.type === 'ai' ? <AIChatItem {...props} /> : <HumanChatItem {...props} />;
};
