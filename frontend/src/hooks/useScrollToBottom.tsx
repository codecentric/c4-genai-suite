import { useEventListener } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';

const SCROLL_TRESHOLD = 200;

export const useScrollToBottom = (instantScrollTiggers: unknown[], animatedScrollTriggers: unknown[]) => {
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScrollButtonVisibility = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    const isAtBottom = scrollHeight - scrollTop - clientHeight <= SCROLL_TRESHOLD;
    setShowButton(!isAtBottom);
  };

  const eventListenerRef = useEventListener<keyof HTMLElementEventMap, HTMLDivElement>('scroll', updateScrollButtonVisibility);

  useEffect(() => {
    updateScrollButtonVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, animatedScrollTriggers);

  const scrollToBottom = (instant?: boolean) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: instant ? 'instant' : 'smooth',
    });
  };

  useEffect(() => {
    scrollToBottom(true);
    setShowButton(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, instantScrollTiggers);

  return {
    canScrollToBottom: showButton,
    scrollToBottom,
    containerRef: (element: HTMLDivElement | null) => {
      containerRef.current = element;
      eventListenerRef(element);
    },
  };
};
