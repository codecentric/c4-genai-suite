import { screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { render } from '../test-utils';
import { BucketsPage } from './BucketsPage';

describe('BucketsPage', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should have a level-one heading for accessibility', () => {
    render(<BucketsPage />);

    const heading = screen.getByRole('heading', { level: 1, name: texts.files.headline });
    expect(heading).toBeInTheDocument();
  });
});
