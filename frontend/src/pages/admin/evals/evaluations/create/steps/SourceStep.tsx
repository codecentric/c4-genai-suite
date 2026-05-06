import { useWizardStore } from '../../state/zustand/wizardState';
import { CatalogSelectionStep } from './CatalogSelectionStep';
import { ManualTestCasesStep } from './ManualTestCasesStep';

/**
 * Router component that displays the appropriate source selection step
 * based on the selected mode
 */
export function SourceStep() {
  const mode = useWizardStore((state) => state.mode);

  if (mode === 'catalog') {
    return <CatalogSelectionStep />;
  }

  if (mode === 'manual') {
    return <ManualTestCasesStep />;
  }

  return null;
}
