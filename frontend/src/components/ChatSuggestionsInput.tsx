import { Box, Button, InputLabel, SimpleGrid } from '@mantine/core';
import { Text } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';
import { MAX_SUGGESTIONS } from 'src/components';
import { texts } from 'src/texts';
import { ChatSuggestionInputCard } from './ChatSuggestionInputCard';

type Suggestion = { title: string; subtitle: string; text: string };

type ChatSuggestionsFormValues = {
  chatSuggestions?: Suggestion[];
};

type ChatSuggestionsInputProps<T> = {
  form: UseFormReturnType<T>;
  description?: string;
};

export function ChatSuggestionsInput<T extends ChatSuggestionsFormValues>({ form, description }: ChatSuggestionsInputProps<T>) {
  const handleAddSuggestion = () => {
    form.insertListItem('chatSuggestions', {
      title: 'Title',
      subtitle: 'Subtitle',
      text: 'Suggested text',
    });
  };
  const handleDeleteSuggestion = (index: number) => form.removeListItem(`chatSuggestions`, index);
  const values = form.values;
  return (
    <Box>
      <InputLabel>Suggestions</InputLabel>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <SimpleGrid cols={1}>
        {values.chatSuggestions?.map((_, index) => (
          <ChatSuggestionInputCard
            key={index}
            titleProps={{
              key: form.key(`chatSuggestions.${index}.title`),
              ...form.getInputProps(`chatSuggestions.${index}.title`),
            }}
            subtitleProps={{
              key: form.key(`chatSuggestions.${index}.subtitle`),
              ...form.getInputProps(`chatSuggestions.${index}.subtitle`),
            }}
            suggestionProps={{
              key: form.key(`chatSuggestions.${index}.text`),
              ...form.getInputProps(`chatSuggestions.${index}.text`),
            }}
            onDeleteClick={() => handleDeleteSuggestion(index)}
          />
        ))}
        {!values.chatSuggestions ||
          (values.chatSuggestions.length < MAX_SUGGESTIONS && (
            <Button radius="md" leftSection={<IconPlus />} mih={128} variant="outline" h={'100%'} onClick={handleAddSuggestion}>
              {texts.theme.suggestionsAdd}
            </Button>
          ))}
      </SimpleGrid>
    </Box>
  );
}
