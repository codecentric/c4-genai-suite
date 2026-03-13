import { ConfigurationDto } from 'src/api';
import { Theme } from 'src/hooks';
import { cn } from 'src/lib';
import { isMobile } from 'src/pages/utils';

interface SuggestionsProps {
  configuration?: ConfigurationDto;
  theme: Theme;
  onSelect: (input: string) => void;
}

export function Suggestions(props: SuggestionsProps) {
  const { configuration, onSelect, theme } = props;

  const suggestions = [...(theme.chatSuggestions || []), ...(configuration?.chatSuggestions || [])];

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid max-h-[calc(100vh-400px)] gap-2 overflow-auto', { 'grid-cols-3': !isMobile() })}>
      {suggestions.map((x, i) => (
        <button
          type="button"
          className="h-auto cursor-pointer flex-col items-start overflow-hidden rounded-lg border border-gray-300 bg-transparent p-3 text-left text-sm hover:bg-gray-50"
          key={i}
          onClick={() => onSelect(x.text)}
        >
          <div>{x.title}</div>

          <div className="text-gray-500">{x.subtitle}</div>
        </button>
      ))}
    </div>
  );
}
