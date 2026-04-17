import { Button, Portal, Stepper } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { Dto } from 'src/api/generated-eval';
import { FormAlert, Modal } from 'src/components';
import { texts } from 'src/texts';
import { AssistantSelectionStep } from './create/steps/AssistantSelectionStep';
import { MetricsSelectionStep } from './create/steps/MetricsSelectionStep';
import { ModeSelectionStep } from './create/steps/ModeSelectionStep';
import { ReviewStep } from './create/steps/ReviewStep';
import { SourceStep } from './create/steps/SourceStep';
import { useCreateEvaluation } from './hooks/useEvaluationMutations';
import { useIsLastStep, useWizardStepIndex, useWizardStore } from './state/hooks';

interface CreateEvaluationDialogProps {
  onClose: () => void;
  onCreate: () => void;
}

export function CreateEvaluationDialog({ onClose, onCreate }: CreateEvaluationDialogProps) {
  const navigate = useNavigate();

  const {
    currentStep,
    mode,
    name,
    description,
    catalogId,
    testCasesPerQaPair,
    testCases,
    metricIds,
    c4AssistantId,
    c4AssistantName,
    nextStep,
    previousStep,
    canProceed,
    reset,
  } = useWizardStore();

  const stepIndex = useWizardStepIndex();
  const isLastStep = useIsLastStep();
  const isFirstStep = stepIndex === 0;

  const createEvaluationMutation = useCreateEvaluation();
  const isPending = createEvaluationMutation.isPending;

  const handleNext = () => {
    if (canProceed()) {
      nextStep();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = () => {
    const dto = {
      name,
      c4AssistantId: c4AssistantId!,
      c4AssistantName: c4AssistantName,
      metrics: metricIds,
      testCases: mode === 'catalog' ? [] : testCases,
      ...(description ? { description } : {}),
      ...(mode === 'catalog' ? { catalogId: catalogId!, testCasesPerQaPair: testCasesPerQaPair || 1 } : {}),
    } as Dto;

    createEvaluationMutation.mutate(dto, {
      onSuccess: (evaluation) => {
        reset();
        onCreate();
        void navigate(`/admin/evals/evaluations/${evaluation.id}`);
      },
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'mode':
        return <ModeSelectionStep />;
      case 'source':
        return <SourceStep />;
      case 'metrics':
        return <MetricsSelectionStep />;
      case 'assistant':
        return <AssistantSelectionStep />;
      case 'review':
        return <ReviewStep />;
      default:
        return null;
    }
  };

  return (
    <Portal>
      <Modal
        onClose={handleClose}
        header={texts.evals.evaluations.createEvaluation}
        size="xl"
        footer={
          <fieldset disabled={isPending}>
            <div className="flex flex-row justify-between">
              <Button type="button" variant="subtle" onClick={handleClose}>
                {texts.common.cancel}
              </Button>
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button type="button" variant="default" onClick={previousStep}>
                    {texts.common.back}
                  </Button>
                )}
                {!isLastStep ? (
                  <Button type="button" onClick={handleNext} disabled={!canProceed()}>
                    {texts.common.next}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleCreate} disabled={!canProceed()} loading={isPending}>
                    {texts.evals.evaluations.createEvaluation}
                  </Button>
                )}
              </div>
            </div>
          </fieldset>
        }
      >
        <fieldset disabled={isPending} className="flex flex-col gap-4">
          <FormAlert common={texts.evals.evaluations.createFailed} error={createEvaluationMutation.error as Error | null} />

          {/* Stepper */}
          <Stepper active={stepIndex} size="sm" iconSize={32}>
            <Stepper.Step
              label={texts.evals.evaluations.wizard.modeStep}
              description={texts.evals.evaluations.wizard.modeStepDescription}
              completedIcon={<IconCheck size={18} />}
            />
            <Stepper.Step
              label={texts.evals.evaluations.wizard.sourceStep}
              description={texts.evals.evaluations.wizard.sourceStepDescription}
              completedIcon={<IconCheck size={18} />}
            />
            <Stepper.Step
              label={texts.evals.evaluations.wizard.metricsStep}
              description={texts.evals.evaluations.wizard.metricsStepDescription}
              completedIcon={<IconCheck size={18} />}
            />
            <Stepper.Step
              label={texts.evals.evaluations.wizard.assistantStep}
              description={texts.evals.evaluations.wizard.assistantStepDescription}
              completedIcon={<IconCheck size={18} />}
            />
            <Stepper.Step
              label={texts.evals.evaluations.wizard.reviewStep}
              description={texts.evals.evaluations.wizard.reviewStepDescription}
              completedIcon={<IconCheck size={18} />}
            />
          </Stepper>

          {/* Step Content */}
          <div style={{ minHeight: '300px' }}>{renderStepContent()}</div>
        </fieldset>
      </Modal>
    </Portal>
  );
}
