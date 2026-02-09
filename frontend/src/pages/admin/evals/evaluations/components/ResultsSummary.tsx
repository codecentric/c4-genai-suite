import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { MetricResultsSection } from './MetricResultsSection';

interface ResultsSummaryProps {
  evaluation: EvaluationDetailSummary;
}

/**
 * Results summary section showing metric results as donut charts.
 * The overall test case pie chart is now integrated into EvaluationCard.
 */
export function ResultsSummary({ evaluation }: ResultsSummaryProps) {
  const { metricResults } = evaluation;

  // Only render if there are metric results
  if (metricResults.length === 0) {
    return null;
  }

  return <MetricResultsSection metricResults={metricResults} />;
}
