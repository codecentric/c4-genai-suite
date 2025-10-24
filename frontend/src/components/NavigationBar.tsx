import { ActionIcon, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { PropsWithChildren } from 'react';
import { Logo } from 'src/components/Logo';
import { TransientNavLink } from 'src/components/TransientNavLink';
import { Theme } from 'src/hooks';
import { cn } from 'src/lib';
import { texts } from 'src/texts';
import { useDocsContext } from './InAppDocsProvider';

interface NavigationBarProps extends PropsWithChildren {
  theme: Theme;
  redirectTo?: string;
}

export function NavigationBar({ theme, redirectTo }: NavigationBarProps) {
  const { isDocsButtonVisible, toggleDocs } = useDocsContext();
  const content = theme.logoUrl ? <Logo key={theme.key} size={{ height: '60%' }} url={theme.logoUrl} /> : theme.name;
  const className = 'flex h-12 items-center text-xl font-bold px-0';
  return (
    <div className="bg-primary-content text-primary flex items-center justify-start px-2">
      <h1 className="sr-only">{theme.name}</h1>
      {redirectTo ? (
        <TransientNavLink className={cn('btn btn-ghost hover:bg-transparent', className)} to={redirectTo} data-testid="logo-link">
          {content}
        </TransientNavLink>
      ) : (
        <div className={className}>{content}</div>
      )}
      {isDocsButtonVisible && (
        <div className="ml-auto">
          <ActionIcon onClick={toggleDocs} size="xl" variant="subtle" color="primary">
            <Tooltip label={texts.common.show(texts.common.docs)}>
              <IconHelp data-testid="docs-icon" />
            </Tooltip>
          </ActionIcon>
        </div>
      )}
    </div>
  );
}
