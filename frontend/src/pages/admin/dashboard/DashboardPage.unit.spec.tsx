import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../test-utils.tsx';
import { DashboardPage } from './DashboardPage.tsx';

vi.mock('recharts', async () => {
  const OriginalRechartsModule = await vi.importActual('recharts');

  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ height, children }: { height: number; children?: ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 800, height }}>
        {children}
      </div>
    ),
  };
});

describe('DashboardPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('should show the version hash', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('version').innerHTML).toEqual('Version: No hash available§');
  });

  it('should have a level-one heading for accessibility', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });
});
