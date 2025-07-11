import { useEventListener } from '@mantine/hooks';
import { RefObject, useEffect, useState } from 'react';

const SCROLL_TRESHOLD = 200;

export const useScrollToBottom = (instantScrollTiggers: unknown[], animatedScrollTriggers: unknown[]) => {
  const [showButton, setShowButton] = useState(false);

  const updateScrollButtonVisibility = (messagesContainerRef: RefObject<HTMLDivElement | null>) => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;

    const isAtBottom = scrollHeight - scrollTop - clientHeight <= SCROLL_TRESHOLD;
    setShowButton(!isAtBottom);
  };

  const messagesContainerRef = useEventListener<keyof HTMLElementEventMap, HTMLDivElement>('scroll', () => {
    updateScrollButtonVisibility(messagesContainerRef);
  });

  useEffect(() => {
    updateScrollButtonVisibility(messagesContainerRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, animatedScrollTriggers);

  const scrollToBottom = (instant?: boolean) =>
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current?.scrollHeight,
      behavior: instant ? 'instant' : 'smooth',
    });

  useEffect(() => {
    scrollToBottom(true);
    setShowButton(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, instantScrollTiggers);

  return {
    canScrollToBottom: showButton,
    scrollToBottom,
    containerRef: messagesContainerRef as RefObject<HTMLDivElement>,
  };
};
