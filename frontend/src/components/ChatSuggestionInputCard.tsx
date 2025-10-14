import { ActionIcon, Card, Textarea, TextareaProps, TextInput, TextInputProps } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { texts } from 'src/texts';

type ChatSuggestionInputCardProps = {
  titleProps: TextInputProps;
  subtitleProps: TextInputProps;
  suggestionProps: TextareaProps;
  onDeleteClick: VoidFunction;
};

export const ChatSuggestionInputCard = ({
  titleProps,
  subtitleProps,
  suggestionProps,
  onDeleteClick,
}: ChatSuggestionInputCardProps) => (
  <Card withBorder radius="md" className="group relative">
    <TextInput mb="xs" label={texts.common.title} placeholder={texts.common.title} {...titleProps} />
    <TextInput mb="xs" label={texts.common.subtitle} placeholder={texts.common.subtitle} {...subtitleProps} />
    <Textarea
      style={{ colSpan: 2 }}
      label={texts.common.text}
      placeholder={texts.common.text}
      resize="vertical"
      autosize
      minRows={3}
      maxRows={15}
      {...suggestionProps}
    />
    <ActionIcon
      color="red"
      className="absolute top-0 right-0 m-2 opacity-0 group-hover:opacity-100"
      variant="light"
      onClick={onDeleteClick}
    >
      <IconTrash className="w-5" />
    </ActionIcon>
  </Card>
);
