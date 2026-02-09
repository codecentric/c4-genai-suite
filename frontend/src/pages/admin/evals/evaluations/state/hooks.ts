/**
 * Public hooks for evaluation wizard state management.
 * This file provides the approved interface for accessing wizard state.
 */

export { useWizardStore, useWizardStepIndex, useIsLastStep } from './zustand/wizardState';
export type { EvaluationMode, WizardStep } from './zustand/wizardState';
