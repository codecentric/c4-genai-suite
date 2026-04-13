import { PropsWithChildren, ReactNode } from 'react';
import { cn } from 'src/lib';

interface PageProps extends PropsWithChildren {
  // The optional menu.
  menu?: ReactNode;
}

export function Page(props: PageProps) {
  const { children, menu } = props;

  return (
    <div className="relative grow">
      {menu && (
        <div className="absolute top-0 bottom-0 left-0 flex w-[270px] shrink-0 flex-grow flex-col overflow-y-hidden border-l border-l-gray-200 bg-white">
          {menu}
        </div>
      )}

      <main
        className={cn('absolute top-0 right-0 bottom-0 overflow-y-auto bg-gray-50', {
          'left-[270px]': !!menu,
          'left-0': !menu,
        })}
      >
        <div
          className={cn('min-w-[500px] px-12 py-8', {
            'max-w-[900px]': !!menu,
            'max-w-[1100px]': !menu,
          })}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
