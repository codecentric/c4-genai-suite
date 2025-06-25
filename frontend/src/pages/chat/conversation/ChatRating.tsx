import { Dialog } from 'src/pages/Dialog';
import { texts } from 'src/texts';
import { useStateMutateChatRating } from '../state/chat';

export function ChatRating({ chatId }: { chatId: number }) {
  const updateConversationRating = useStateMutateChatRating(chatId);

  return (
    <Dialog
      title={texts.chat.rateConversation}
      thankYouText={texts.chat.updateRating.thanksForYourValuableFeedback}
      onSubmit={(answer) => {
        if (answer === 'yes') updateConversationRating.mutate('good');
        if (answer === 'no') updateConversationRating.mutate('bad');
        if (answer === 'dismiss') updateConversationRating.mutate('unrated');
      }}
    />
  );
}
