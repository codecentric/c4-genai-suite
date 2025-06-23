import { ConversationDto } from 'src/api';
import { Dialog } from 'src/pages/Dialog';
import { texts } from 'src/texts';
import { useStateMutateConversationRating } from '../state';

export function ConversationRating({ conversation }: { conversation: ConversationDto }) {
  const updateConversationRating = useStateMutateConversationRating(conversation.id);

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
