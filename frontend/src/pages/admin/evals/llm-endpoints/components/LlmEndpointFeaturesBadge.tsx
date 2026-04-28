import { PluginFeature } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface LlmEndpointFeaturesBadgeProps {
  features: PluginFeature[];
}

export function LlmEndpointFeaturesBadge({ features }: LlmEndpointFeaturesBadgeProps) {
  if (!features || features.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex gap-1.5">
      {features.map((feature) => (
        <span key={feature} className="badge badge-sm badge-outline">
          {getFeatureLabel(feature)}
        </span>
      ))}
    </div>
  );
}

function getFeatureLabel(feature: PluginFeature): string {
  switch (feature) {
    case PluginFeature.ChatModel:
      return texts.evals.llmEndpoint.featureChat;
    case PluginFeature.LlmQuery:
      return texts.evals.llmEndpoint.featureLlm;
    default:
      return String(feature);
  }
}
