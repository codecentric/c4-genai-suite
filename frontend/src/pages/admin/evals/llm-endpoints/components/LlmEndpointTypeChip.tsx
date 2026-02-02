import { texts } from 'src/texts';

interface LlmEndpointTypeChipProps {
  type: string;
}

export function LlmEndpointTypeChip({ type }: LlmEndpointTypeChipProps) {
  const config = getTypeConfig(type);

  return (
    <div className={`badge ${config.badgeClass}`}>
      <span>{config.label}</span>
    </div>
  );
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'C4':
      return {
        label: texts.evals.llmEndpoint.typeC4,
        badgeClass: 'badge-primary',
      };
    case 'OPENAI':
      return {
        label: texts.evals.llmEndpoint.typeOpenAI,
        badgeClass: 'badge-info',
      };
    case 'AZURE_OPENAI':
      return {
        label: texts.evals.llmEndpoint.typeAzureOpenAI,
        badgeClass: 'badge-accent',
      };
    default:
      return {
        label: type,
        badgeClass: 'badge-ghost',
      };
  }
}
