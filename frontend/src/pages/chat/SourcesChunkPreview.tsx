import { ActionIcon, Blockquote, Button, Card, Group, Loader, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from 'src/api';
import { Alert } from 'src/components';
import { useDocument, useDocumentContent } from 'src/hooks/api/files';

export type SourcesChunkPreviewProps = {
  document: DocumentSource;
  onClose: () => void;
};

export type DocumentSource = {
  conversationId: number;
  messageId: number;
  documentUri: string;
};

export const SourcesChunkPreview = ({ onClose, document }: SourcesChunkPreviewProps) => {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useDocumentContent(
    document.conversationId,
    document.messageId,
    document.documentUri,
  );

  // TODO: remove console log after debugging
  const { conversations } = useApi();
  console.log("await")
  conversations.getDocument(document.conversationId, document.messageId, document.documentUri).then((res) => {console.log("awaited", res)});

  // TODO: do something sensible
  const { data: data2 } = useDocument(
    document.conversationId,
    document.messageId,
    document.documentUri,
  );
  console.log(data2);


  const container = (children: ReactNode) => (
    <Card withBorder mt="sm" mr="xs" ml="6">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500}>{t('chat.sources.content')}</Text>
          <ActionIcon onClick={onClose} variant="subtle" color="gray" aria-label="close">
            <IconX title="close" />
          </ActionIcon>
        </Group>
      </Card.Section>
      {children}
    </Card>
  );
  if (isError)
    return container(
      <Alert text={t('common.errorLoading')} className="mt-4">
        <Button color="red" size="compact-xs" variant="light" mt="sm" onClick={() => refetch()}>
          {t('common.tryAgain')}
        </Button>
      </Alert>,
    );
  if (isPending) return container(<Loader className="mx-auto my-32" />);
  return container(
    data.map((chunk, index) => (
      <Blockquote key={index} mt="lg" p="md" className="overflow-clip">
        <Text size="sm">[...] {chunk} [...]</Text>
      </Blockquote>
    )),
  );
};
