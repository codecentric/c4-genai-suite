import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { texts } from 'src/texts';
import { render } from '../test-utils';
import { ThemePage } from './ThemePage';

vi.mock('./LogoUpload', () => ({ LogoUpload: () => null }));
vi.mock('./ThemeForm', () => ({ ThemeForm: () => null }));

describe('ThemePage', () => {
  it('should contain a level-one heading for accessibility', () => {
    render(<ThemePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(texts.theme.headline);
  });
});
