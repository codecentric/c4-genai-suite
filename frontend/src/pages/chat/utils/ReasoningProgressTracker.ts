import { useReasoning } from '../hooks/useReasoning';
import { ReasoningStep } from '../state/types';

/**
 * Example utility demonstrating how to use the reasoning display functionality
 * This can be used as a reference for integrating reasoning into chat streams
 */
export class ReasoningProgressTracker {
  private useReasoningHook: ReturnType<typeof useReasoning>;
  private activeSteps: Map<string, string> = new Map();

  constructor(useReasoningHook: ReturnType<typeof useReasoning>) {
    this.useReasoningHook = useReasoningHook;
  }

  /**
   * Start a new reasoning step
   */
  startStep(title: string, initialContent: string = ''): string {
    const step = this.useReasoningHook.createReasoningStep(title, initialContent, 'pending');
    this.useReasoningHook.addStep(step);
    this.activeSteps.set(title, step.id);
    return step.id;
  }

  /**
   * Mark a step as in progress
   */
  progressStep(title: string, content?: string): void {
    const stepId = this.activeSteps.get(title);
    if (stepId) {
      const update: Partial<ReasoningStep> = { status: 'in-progress' };
      if (content) update.content = content;
      this.useReasoningHook.updateStep(stepId, update);
    }
  }

  /**
   * Complete a reasoning step
   */
  completeStep(title: string, finalContent?: string): void {
    const stepId = this.activeSteps.get(title);
    if (stepId) {
      const update: Partial<ReasoningStep> = { status: 'completed' };
      if (finalContent) update.content = finalContent;
      this.useReasoningHook.updateStep(stepId, update);
      this.activeSteps.delete(title);
    }
  }

  /**
   * Mark a step as failed
   */
  failStep(title: string, errorContent?: string): void {
    const stepId = this.activeSteps.get(title);
    if (stepId) {
      const update: Partial<ReasoningStep> = { status: 'error' };
      if (errorContent) update.content = errorContent;
      this.useReasoningHook.updateStep(stepId, update);
      this.activeSteps.delete(title);
    }
  }

  /**
   * Update step content while keeping the same status
   */
  updateStepContent(title: string, content: string): void {
    const stepId = this.activeSteps.get(title);
    if (stepId) {
      this.useReasoningHook.updateStep(stepId, { content });
    }
  }

  /**
   * Clear all reasoning steps
   */
  clearAll(): void {
    this.useReasoningHook.clearSteps();
    this.activeSteps.clear();
  }

  /**
   * Example workflow for a typical AI reasoning process
   */
  async runExampleReasoningFlow(): Promise<void> {
    // Step 1: Analyze the request
    this.startStep('Analyzing Request', "Breaking down the user's query into components...");
    await this.simulateDelay(1000);
    this.progressStep('Analyzing Request', 'Identified key concepts and requirements.');
    await this.simulateDelay(1500);
    this.completeStep('Analyzing Request', 'Successfully analyzed the request. Found 3 key components to address.');

    // Step 2: Search for information
    this.startStep('Gathering Information', 'Searching through available knowledge base...');
    await this.simulateDelay(800);
    this.progressStep('Gathering Information', 'Found relevant documentation and examples.');
    await this.simulateDelay(1200);
    this.completeStep('Gathering Information', 'Collected comprehensive information from 5 different sources.');

    // Step 3: Formulate response
    this.startStep('Formulating Response', 'Organizing information into a coherent response...');
    await this.simulateDelay(1000);
    this.progressStep('Formulating Response', 'Structuring the response with examples and explanations.');
    await this.simulateDelay(1500);
    this.completeStep('Formulating Response', 'Response ready. Includes detailed explanation with code examples.');
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Hook that provides a convenient reasoning tracker
 */
export const useReasoningTracker = (chatId: number, messageId: number) => {
  const reasoningHook = useReasoning(chatId, messageId);
  return new ReasoningProgressTracker(reasoningHook);
};
