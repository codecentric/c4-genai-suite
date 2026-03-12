import { ButtonHTMLAttributes } from 'react';
import { cn } from 'src/lib';
import { isMobile } from 'src/pages/utils';

interface CollapseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // The side of the button.
  side?: 'left' | 'right';

  // Indicates if the button is toggled.
  isToggled?: boolean;

  // The tooltip.
  tooltip?: string;
}

export function CollapseButton(props: CollapseButtonProps) {
  const { className, isToggled, side, tooltip, ...other } = props;

  const sharedClass = 'h-3 w-1 rounded-full bg-gray-500 transition-all group-hover/button:bg-black ease-in';

  return (
    <button
      className={cn(className, 'group/button p-3', { 'pr-0 pl-1': isMobile() })}
      {...other}
      aria-label={tooltip}
      data-tooltip-id="default"
      data-tooltip-content={tooltip}
      data-tooltip-place={side === 'left' ? 'right' : 'left'}
    >
      {side === 'left' ? (
        <div className="flex flex-col">
          <div
            className={cn(
              sharedClass,
              isToggled ? '-rotate-[20deg]' : `${isMobile() ? '' : 'group-hover/button:'}rotate-[20deg]`,
              '-trnslate-y-0',
            )}
          ></div>
          <div
            className={cn(
              sharedClass,
              isToggled ? 'rotate-[20deg]' : `${isMobile() ? '' : 'group-hover/button:'}-rotate-[20deg]`,
              '-translate-y-1',
            )}
          ></div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div
            className={cn(
              sharedClass,
              isToggled ? 'rotate-[20deg]' : `${isMobile() ? '' : 'group-hover/button:'}-rotate-[20deg]`,
              '-trnslate-y-0',
            )}
          ></div>
          <div
            className={cn(
              sharedClass,
              isToggled ? '-rotate-[20deg]' : `${isMobile() ? '' : 'group-hover/button:'}rotate-[20deg]`,
              '-translate-y-1',
            )}
          ></div>
        </div>
      )}
    </button>
  );
}
