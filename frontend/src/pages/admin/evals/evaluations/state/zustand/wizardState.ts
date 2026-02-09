import { create } from 'zustand';
import type { RunEvaluationByTestCasesTestCase } from 'src/api/generated-eval';

export type EvaluationMode = 'catalog' | 'manual';

export type WizardStep = 'mode' | 'source' | 'metrics' | 'endpoint' | 'review';

interface WizardState {
  // Current step
  currentStep: WizardStep;

  // Mode selection
  mode: EvaluationMode | null;

  // Evaluation details
  name: string;
  description?: string;

  // QA Catalog mode
  catalogId: string | null;
  testCasesPerQaPair?: number;

  // Manual mode
  testCases: RunEvaluationByTestCasesTestCase[];

  // Common fields
  metricIds: string[];
  endpointId: string | null;
}

interface WizardActions {
  // Navigation
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Mode
  setMode: (mode: EvaluationMode) => void;

  // Evaluation details
  setName: (name: string) => void;
  setDescription: (description: string) => void;

  // QA Catalog
  setCatalogId: (catalogId: string | null) => void;
  setTestCasesPerQaPair: (count: number) => void;

  // Manual test cases
  setTestCases: (testCases: RunEvaluationByTestCasesTestCase[]) => void;
  addTestCase: (testCase: RunEvaluationByTestCasesTestCase) => void;
  removeTestCase: (index: number) => void;
  updateTestCase: (index: number, testCase: RunEvaluationByTestCasesTestCase) => void;

  // Metrics
  setMetricIds: (metricIds: string[]) => void;
  addMetricId: (metricId: string) => void;
  removeMetricId: (metricId: string) => void;

  // Endpoint
  setEndpointId: (endpointId: string | null) => void;

  // Reset
  reset: () => void;

  // Validation
  canProceed: () => boolean;
}

const stepOrder: WizardStep[] = ['mode', 'source', 'metrics', 'endpoint', 'review'];

const initialState: WizardState = {
  currentStep: 'mode',
  mode: null,
  name: '',
  description: undefined,
  catalogId: null,
  testCasesPerQaPair: 1,
  testCases: [],
  metricIds: [],
  endpointId: null,
};

export const useWizardStore = create<WizardState & WizardActions>()((set, get) => ({
  ...initialState,

  setStep: (step: WizardStep) => set({ currentStep: step }),

  nextStep: () => {
    const currentIndex = stepOrder.indexOf(get().currentStep);
    if (currentIndex < stepOrder.length - 1) {
      set({ currentStep: stepOrder[currentIndex + 1] });
    }
  },

  previousStep: () => {
    const currentIndex = stepOrder.indexOf(get().currentStep);
    if (currentIndex > 0) {
      set({ currentStep: stepOrder[currentIndex - 1] });
    }
  },

  setMode: (mode: EvaluationMode) => set({ mode }),

  setName: (name: string) => set({ name }),

  setDescription: (description: string) => set({ description }),

  setCatalogId: (catalogId: string | null) => set({ catalogId }),

  setTestCasesPerQaPair: (count: number) => set({ testCasesPerQaPair: count }),

  setTestCases: (testCases: RunEvaluationByTestCasesTestCase[]) => set({ testCases }),

  addTestCase: (testCase: RunEvaluationByTestCasesTestCase) => set((state) => ({ testCases: [...state.testCases, testCase] })),

  removeTestCase: (index: number) =>
    set((state) => ({
      testCases: state.testCases.filter((_, i) => i !== index),
    })),

  updateTestCase: (index: number, testCase: RunEvaluationByTestCasesTestCase) =>
    set((state) => ({
      testCases: state.testCases.map((tc, i) => (i === index ? testCase : tc)),
    })),

  setMetricIds: (metricIds: string[]) => set({ metricIds }),

  addMetricId: (metricId: string) =>
    set((state) => ({
      metricIds: state.metricIds.includes(metricId) ? state.metricIds : [...state.metricIds, metricId],
    })),

  removeMetricId: (metricId: string) =>
    set((state) => ({
      metricIds: state.metricIds.filter((id) => id !== metricId),
    })),

  setEndpointId: (endpointId: string | null) => set({ endpointId }),

  reset: () => set(initialState),

  canProceed: () => {
    const state = get();
    const { currentStep, mode, catalogId, testCases, metricIds, endpointId, name } = state;

    switch (currentStep) {
      case 'mode':
        return mode !== null;
      case 'source':
        if (mode === 'catalog') {
          return catalogId !== null;
        } else {
          return testCases.length > 0;
        }
      case 'metrics':
        return metricIds.length > 0;
      case 'endpoint':
        return endpointId !== null;
      case 'review':
        return name.trim().length > 0;
      default:
        return false;
    }
  },
}));

/**
 * Hook to get the current step index for stepper component
 */
export function useWizardStepIndex(): number {
  const currentStep = useWizardStore((state) => state.currentStep);
  return stepOrder.indexOf(currentStep);
}

/**
 * Hook to check if on the last step
 */
export function useIsLastStep(): boolean {
  const currentStep = useWizardStore((state) => state.currentStep);
  return currentStep === stepOrder[stepOrder.length - 1];
}
