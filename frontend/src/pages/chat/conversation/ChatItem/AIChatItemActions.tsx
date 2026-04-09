import { ActionIcon, Alert, Button, Flex } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconClipboard, IconThumbDown } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { MessageDtoRatingEnum, ProfileDto } from 'src/api';
import { Icon } from 'src/components';
import { cn } from 'src/lib';
import { texts } from 'src/texts';
import { useStateMutateMessageRating } from '../../state/chat';

interface AIChatItemActionsProps {
  tokenCount?: number;
  messageId: number;
  renderAlways?: boolean;
  rating?: MessageDtoRatingEnum;
  user: ProfileDto;
  copyTextToClipboard: () => void;
}

const RATINGS: MessageDtoRatingEnum[] = ['incorrect', 'instructions_not_followed', 'insufficient_style', 'lazy', 'refused'];

const useVisibilityToggle = () => {
  const [isVisible, setIsVisible] = useState(false);
  return {
    isVisible,
    toggleVisibility: () => setIsVisible(!isVisible),
    setHiddenVisibility: () => setIsVisible(false),
  };
};

export const AIChatItemActions = ({
  messageId,
  copyTextToClipboard,
  rating,
  renderAlways,
  tokenCount,
  user,
}: AIChatItemActionsProps) => {
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const updateMessageRating = useStateMutateMessageRating(messageId);

  const { isVisible: isRatingSelectorVisible, toggleVisibility, setHiddenVisibility } = useVisibilityToggle();

  useEffect(() => {
    if (isRatingSelectorVisible && scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isRatingSelectorVisible]);

  if (messageId === 0) {
    return null;
  }
  return (
    <>
      <div
        className={cn(
          { 'fade-in opacity-100': renderAlways },
          'flex items-center opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100',
        )}
      >
        <ActionIcon
          color="gray"
          c="black"
          size={'lg'}
          variant="subtle"
          onClick={copyTextToClipboard}
          aria-label={texts.common.copy}
          data-tooltip-id="default"
          data-tooltip-content={texts.common.copy}
        >
          <IconClipboard className="w-4" />
        </ActionIcon>
        <ActionIcon
          onClick={toggleVisibility}
          color="gray"
          c="black"
          size={'lg'}
          variant="subtle"
          aria-label={texts.chat.rateMessage}
          data-tooltip-id="default"
          data-tooltip-content={texts.chat.rateMessage}
        >
          <IconThumbDown className="w-4" />
        </ActionIcon>

        {user.isAdmin && tokenCount && tokenCount > 0 && (
          <div className="ms-2 text-sm text-gray-600">
            {tokenCount} {texts.common.tokens}
          </div>
        )}
      </div>

      {isRatingSelectorVisible && (
        <>
          <div className="relative mt-2 mb-8 rounded-xl border border-gray-300 p-4">
            <button
              className="btn btn-ghost btn-sm absolute top-1 right-1 p-2"
              onClick={setHiddenVisibility}
              aria-label={texts.chat.updateRating.close}
              data-tooltip-id="default"
              data-tooltip-content={texts.chat.updateRating.close}
            >
              <Icon size={16} icon="close" />
            </button>

            <div className="mb-2 text-sm">{texts.chat.ratingHint}</div>

            <div className={cn('flex flex-wrap gap-2', { 'opacity-50': updateMessageRating.isPending })}>
              {updateMessageRating.isSuccess && (
                <Alert
                  variant="light"
                  color="green"
                  title={<p>{texts.chat.updateRating.ratingSubmitted}</p>}
                  icon={<IconCircleCheck />}
                  p="xs"
                  w="100%"
                  classNames={{
                    title: 'text-green-800',
                  }}
                  styles={{ root: { outlineOffset: '-2px' } }}
                >
                  <p className="text-green-800">{texts.chat.updateRating.thanksForYourValuableFeedback}</p>
                  <Flex>
                    <Button
                      variant="light"
                      size="compact-xs"
                      color="green"
                      mt="xs"
                      onClick={updateMessageRating.reset}
                      classNames={{ label: 'text-green-800' }}
                      styles={{ root: { outlineOffset: '-2px' } }}
                    >
                      {texts.chat.updateRating.changeResponse}
                    </Button>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="green"
                      mt="xs"
                      onClick={setHiddenVisibility}
                      classNames={{ label: 'text-green-800' }}
                      styles={{ root: { outlineOffset: '-2px' } }}
                    >
                      {texts.chat.updateRating.close}
                    </Button>
                  </Flex>
                </Alert>
              )}
              {updateMessageRating.isError && updateMessageRating.error instanceof Error && (
                <Alert
                  variant="light"
                  color="red"
                  title={<p>{texts.chat.updateRating.raitingFailed}</p>}
                  icon={<IconAlertCircle />}
                  p="xs"
                  w="100%"
                  classNames={{
                    title: 'text-red-800',
                  }}
                >
                  <p className="text-red-800">{updateMessageRating.error.message}</p>
                  <Button
                    variant="light"
                    size="compact-xs"
                    color="red"
                    mt="xs"
                    onClick={() => updateMessageRating.variables && updateMessageRating.mutate(updateMessageRating.variables)}
                    classNames={{ label: 'text-red-800' }}
                    styles={{ root: { outlineOffset: '-2px' } }}
                  >
                    {texts.chat.updateRating.retry}
                  </Button>
                </Alert>
              )}
              {['idle', 'pending'].includes(updateMessageRating.status) &&
                RATINGS.map((ratingOption) => (
                  <button
                    key={ratingOption}
                    className={cn('btn btn-outline btn-sm border-gray-300', { 'bg-gray-200': rating === ratingOption })}
                    onClick={() => updateMessageRating.mutate(ratingOption)}
                  >
                    {texts.chat.rating[ratingOption]}
                  </button>
                ))}
            </div>
          </div>
          <div ref={scrollTargetRef}></div>
        </>
      )}
    </>
  );
};
