/*
 * Notifo.io
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved.
 */

import React from 'react';
import { DetailedHTMLProps, useEffect } from 'react';
import { useEventCallback } from 'src/hooks';

interface ClickOutsideProps
  extends DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
    React.PropsWithChildren {
  // When clicked outside.
  onClickOutside: (event: MouseEvent) => unknown;

  // Indicates whether the outside click handler is active.
  isActive: boolean;
}

export const ClickOutside = React.memo((props: ClickOutsideProps) => {
  const { children, isActive, onClickOutside, ...other } = props;

  const container = React.useRef<HTMLDivElement>(null);

  const initContainer = useEventCallback((div: HTMLDivElement) => {
    container.current = div;
  });

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Node && container.current && !container.current.contains(event.target)) {
        onClickOutside(event);
      }
    };

    if (isActive) {
      document.addEventListener('click', onClick, true);

      return () => {
        document.removeEventListener('click', onClick, true);
      };
    }

    return undefined;
  }, [isActive, onClickOutside]);

  return (
    <div {...other} ref={initContainer}>
      {children}
    </div>
  );
});
