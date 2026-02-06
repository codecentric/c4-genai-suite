import { texts } from 'src/texts';

interface MetricTypeChipProps {
  type: string;
}

export function MetricTypeChip({ type }: MetricTypeChipProps) {
  const config = getTypeConfig(type);

  return (
    <div className={`badge ${config.badgeClass}`}>
      <span>{config.label}</span>
    </div>
  );
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'ANSWER_RELEVANCY':
      return {
        label: texts.evals.metric.typeAnswerRelevancy,
        badgeClass: 'badge-info', // blue
      };
    case 'FAITHFULNESS':
      return {
        label: texts.evals.metric.typeFaithfulness,
        badgeClass: 'badge-success', // green
      };
    case 'HALLUCINATION':
      return {
        label: texts.evals.metric.typeHallucination,
        badgeClass: 'badge-error', // red
      };
    case 'G_EVAL':
      return {
        label: texts.evals.metric.typeGEval,
        badgeClass: 'badge-secondary', // purple
      };
    default:
      return {
        label: type,
        badgeClass: 'badge-ghost',
      };
  }
}
