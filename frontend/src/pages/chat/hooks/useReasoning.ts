import { useCallback } from 'react';
import { useStateOfReasoning } from '../state/chat';
import { ReasoningStep } from '../state/types';

export const useReasoning = (chatId: number, messageId: number) => {
  const { addReasoningStep, updateReasoningStep, clearReasoning } = useStateOfReasoning(chatId, messageId);

  const addStep = useCallback(
    (step: ReasoningStep) => {
      addReasoningStep(step);
    },
    [addReasoningStep],
  );

  const updateStep = useCallback(
    (stepId: string, update: Partial<ReasoningStep>) => {
      updateReasoningStep(stepId, update);
    },
    [updateReasoningStep],
  );

  const clearAllSteps = useCallback(() => {
    clearReasoning();
  }, [clearReasoning]);

  const createReasoningStep = useCallback(
    (title: string, content: string, status: ReasoningStep['status'] = 'pending'): ReasoningStep => ({
      id: `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      timestamp: new Date(),
      status,
    }),
    [],
  );

  return {
    addStep,
    updateStep,
    clearSteps: clearAllSteps,
    createReasoningStep,
  };
};
