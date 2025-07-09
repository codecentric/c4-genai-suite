import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Progress,
  Rating,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconCalendar,
  IconCheck,
  IconCopy as IconClone,
  IconCopy,
  IconEdit,
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconHistory,
  IconPlayerPlay,
  IconRestore,
  IconStar,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { CreatePromptRatingDto, Prompt, PromptVersion } from 'src/api/prompts';
import { texts } from 'src/texts';
import { VersionCommentModal } from './VersionCommentModal';

interface PromptDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  promptId: number | null;
  onPromptSelect?: (prompt: Prompt) => void;
}

export function PromptDetailsModal({ opened, onClose, promptId, onPromptSelect }: PromptDetailsModalProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [showVersionCommentModal, setShowVersionCommentModal] = useState(false);
  const [versionCommentAction, setVersionCommentAction] = useState<'update' | 'restore' | null>(null);
  const [restoreVersionNumber, setRestoreVersionNumber] = useState<number | null>(null);

  // Fetch prompt details
  const {
    data: prompt,
    isLoading: promptLoading,
    error: _promptError,
  } = useQuery({
    queryKey: ['prompt', promptId],
    queryFn: async () => {
      if (!promptId) return null;
      console.log('Fetching prompt details for ID:', promptId);
      try {
        const result = await api.prompts.getPrompt(promptId);
        console.log('Prompt details loaded:', result);
        return result;
      } catch (error) {
        console.error('Error fetching prompt details:', error);
        throw error;
      }
    },
    enabled: !!promptId && opened,
    retry: false,
  });

  // Fetch versions
  const { data: versions = [] } = useQuery({
    queryKey: ['prompt-versions', promptId],
    queryFn: () => (promptId ? api.prompts.getPromptVersions(promptId) : []),
    enabled: !!promptId && opened,
    retry: false,
  });

  // Fetch ratings
  const { data: ratings = [] } = useQuery({
    queryKey: ['prompt-ratings', promptId],
    queryFn: () => (promptId ? api.prompts.getRatings(promptId) : []),
    enabled: !!promptId && opened,
    retry: false,
  });

  // Fetch user's rating
  const { data: myRating } = useQuery({
    queryKey: ['my-rating', promptId],
    queryFn: () => (promptId ? api.prompts.getMyRating(promptId) : null),
    enabled: !!promptId && opened,
    retry: false,
  });

  // Fetch categories for editing
  const { data: categories = [] } = useQuery({
    queryKey: ['prompt-categories'],
    queryFn: () => api.prompts.getCategories(),
    enabled: opened,
    retry: false,
  });

  // Update prompt mutation with version comment
  const updatePromptMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { title?: string; description?: string; content?: string; categoryId?: number; versionComment: string };
    }) => api.prompts.updatePrompt(id, data),
    onSuccess: () => {
      toast.success('Prompt erfolgreich aktualisiert!');
      setIsEditing(false);
      setShowVersionCommentModal(false);
      void queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
      void queryClient.invalidateQueries({ queryKey: ['prompt-versions', promptId] });
      void queryClient
        .invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return key === 'prompts' || key === 'prompts-library';
          },
        })
        .catch(() => {
          // Ignore invalidation errors
        });
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Prompts');
    },
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: ({
      promptId,
      versionNumber,
      versionComment,
    }: {
      promptId: number;
      versionNumber: number;
      versionComment: string;
    }) => api.prompts.restorePromptVersion(promptId, versionNumber, versionComment),
    onSuccess: () => {
      toast.success('Version erfolgreich wiederhergestellt!');
      setShowVersionCommentModal(false);
      setRestoreVersionNumber(null);
      void queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
      void queryClient.invalidateQueries({ queryKey: ['prompt-versions', promptId] });
      void queryClient
        .invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return key === 'prompts' || key === 'prompts-library';
          },
        })
        .catch(() => {
          // Ignore invalidation errors
        });
    },
    onError: () => {
      toast.error('Fehler beim Wiederherstellen der Version');
    },
  });

  // Other mutations (unchanged)
  const usePromptMutation = useMutation({
    mutationFn: (id: number) => api.prompts.usePrompt(id),
    onSuccess: () => {
      if (prompt && onPromptSelect) {
        onPromptSelect(prompt);
        onClose();
      }
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'prompts' || key === 'prompts-library';
        },
      });
    },
    onError: () => {
      toast.error('Fehler beim Verwenden des Prompts');
    },
  });

  const clonePromptMutation = useMutation({
    mutationFn: (id: number) => api.prompts.clonePrompt(id),
    onSuccess: () => {
      toast.success('Prompt erfolgreich geklont!');
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'prompts' || key === 'prompts-library';
        },
      });
    },
    onError: () => {
      toast.error('Fehler beim Klonen des Prompts');
    },
  });

  const ratePromptMutation = useMutation({
    mutationFn: ({ promptId, data }: { promptId: number; data: CreatePromptRatingDto }) => api.prompts.ratePrompt(promptId, data),
    onSuccess: () => {
      toast.success('Bewertung erfolgreich abgegeben!');
      setShowRatingForm(false);
      setUserRating(0);
      setRatingComment('');
      void queryClient.invalidateQueries({ queryKey: ['prompt-ratings', promptId] });
      void queryClient.invalidateQueries({ queryKey: ['my-rating', promptId] });
      void queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'prompts' || key === 'prompts-library';
        },
      });
    },
    onError: () => {
      toast.error('Fehler beim Bewerten des Prompts');
    },
  });

  // Event handlers
  const handleUsePrompt = () => {
    if (prompt?.content) {
      navigate('/chat/new', { state: { initialPrompt: prompt.content } });
      onClose();
    }
  };

  const handleClonePrompt = () => {
    if (promptId) {
      clonePromptMutation.mutate(promptId);
    }
  };

  const handleCopyPrompt = async () => {
    if (prompt?.content) {
      try {
        await navigator.clipboard.writeText(prompt.content);
        toast.success('Prompt in Zwischenablage kopiert!');
      } catch {
        toast.error('Fehler beim Kopieren');
      }
    }
  };

  const handleSubmitRating = () => {
    if (promptId && userRating > 0) {
      ratePromptMutation.mutate({
        promptId,
        data: {
          rating: userRating,
          comment: ratingComment || undefined,
        },
      });
    }
  };

  const handleStartEdit = () => {
    if (prompt) {
      setEditTitle(prompt.title);
      setEditDescription(prompt.description || '');
      setEditContent(prompt.content);
      setEditCategoryId(prompt.categoryId || null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditDescription('');
    setEditContent('');
    setEditCategoryId(null);
  };

  const handleSaveEdit = () => {
    if (promptId && editTitle.trim() && editContent.trim()) {
      setVersionCommentAction('update');
      setShowVersionCommentModal(true);
    }
  };

  const handleRestoreVersion = (versionNumber: number) => {
    setRestoreVersionNumber(versionNumber);
    setVersionCommentAction('restore');
    setShowVersionCommentModal(true);
  };

  const handleVersionCommentSubmit = (comment: string) => {
    if (versionCommentAction === 'update' && promptId) {
      updatePromptMutation.mutate({
        id: promptId,
        data: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          content: editContent.trim(),
          categoryId: editCategoryId || undefined,
          versionComment: comment,
        },
      });
    } else if (versionCommentAction === 'restore' && promptId && restoreVersionNumber) {
      restoreVersionMutation.mutate({
        promptId,
        versionNumber: restoreVersionNumber,
        versionComment: comment,
      });
    }
  };

  const handleVersionCommentClose = () => {
    setShowVersionCommentModal(false);
    setVersionCommentAction(null);
    setRestoreVersionNumber(null);
  };

  const handleVersionSelect = (version: PromptVersion) => {
    setSelectedVersion(version);
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      distribution[rating.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();
  const totalRatings = ratings.length;

  if (!opened || !promptId) {
    return null;
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="sm">
            <Text size="lg" fw={600}>
              Prompt Details
            </Text>
            {prompt?.category && (
              <Badge size="sm" variant="light" color={prompt.category.color || 'blue'}>
                {prompt.category.name}
              </Badge>
            )}
          </Group>
        }
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {promptLoading ? (
          <Text ta="center" py="xl">
            {texts.chat.prompts.messages.loading}
          </Text>
        ) : !prompt ? (
          <Text ta="center" py="xl" c="red">
            {texts.chat.prompts.messages.notFound}
          </Text>
        ) : (
          <Tabs defaultValue="details" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="details" leftSection={<IconEye size={16} />}>
                {texts.chat.prompts.tabs.details}
              </Tabs.Tab>
              <Tabs.Tab value="versions" leftSection={<IconHistory size={16} />}>
                {texts.chat.prompts.tabs.versions} ({versions.length})
              </Tabs.Tab>
              <Tabs.Tab value="ratings" leftSection={<IconStar size={16} />}>
                {texts.chat.prompts.tabs.ratings} ({totalRatings})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="details" pt="md">
              <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                  <div className="flex-1">
                    {isEditing ? (
                      <Stack gap="sm">
                        <TextInput
                          label={texts.chat.prompts.labels.title}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          required
                        />
                        <TextInput
                          label={texts.chat.prompts.labels.description}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder={texts.chat.prompts.placeholders.optionalDescription}
                        />
                        <Select
                          label={texts.chat.prompts.labels.category}
                          value={editCategoryId?.toString() || null}
                          onChange={(value) => setEditCategoryId(value ? parseInt(value) : null)}
                          data={categories.map((cat) => ({
                            value: cat.id.toString(),
                            label: cat.name,
                          }))}
                          placeholder={texts.chat.prompts.placeholders.selectCategory}
                          clearable
                        />
                      </Stack>
                    ) : (
                      <>
                        <Text size="xl" fw={700} mb="xs">
                          {prompt.title}
                        </Text>
                        {prompt.description && (
                          <Text size="sm" c="dimmed" mb="sm">
                            {prompt.description}
                          </Text>
                        )}
                      </>
                    )}
                  </div>
                  <Group gap="xs">
                    {isEditing ? (
                      <>
                        <Tooltip label={texts.chat.prompts.messages.saveChanges} position="top" withArrow>
                          <ActionIcon
                            variant="light"
                            color="green"
                            size="lg"
                            onClick={handleSaveEdit}
                            loading={updatePromptMutation.isPending}
                          >
                            <IconCheck size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={texts.chat.prompts.messages.cancelEdit} position="top" withArrow>
                          <ActionIcon variant="light" color="red" size="lg" onClick={handleCancelEdit}>
                            <IconX size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip label={texts.chat.prompts.tooltips.editPrompt} position="top" withArrow>
                          <ActionIcon variant="light" color="blue" size="lg" onClick={handleStartEdit}>
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={
                            isFavorite
                              ? texts.chat.prompts.messages.removeFromFavorites
                              : texts.chat.prompts.messages.addToFavorites
                          }
                          position="top"
                          withArrow
                        >
                          <ActionIcon
                            variant={isFavorite ? 'filled' : 'light'}
                            color="red"
                            size="lg"
                            onClick={() => setIsFavorite(!isFavorite)}
                          >
                            {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                  </Group>
                </Group>

                {/* Stats */}
                <Group gap="xl">
                  <Tooltip
                    label={texts.chat.prompts.messages.averageRating(Number(prompt.averageRating) || 0, prompt.ratingCount || 0)}
                    position="top"
                    withArrow
                  >
                    <Group gap="xs">
                      <Rating value={prompt.averageRating || 0} readOnly size="sm" />
                      <Text size="sm" c="dimmed">
                        {(Number(prompt.averageRating) || 0).toFixed(1)} ({prompt.ratingCount || 0}{' '}
                        {texts.chat.prompts.tabs.ratings})
                      </Text>
                    </Group>
                  </Tooltip>
                  <Tooltip label={texts.chat.prompts.messages.usageCount} position="top" withArrow>
                    <Group gap="xs">
                      <IconEye size={16} className="text-gray-500" />
                      <Text size="sm" c="dimmed">
                        {prompt.usageCount} {texts.chat.prompts.messages.usedTimes}
                      </Text>
                    </Group>
                  </Tooltip>
                  <Tooltip label={texts.chat.prompts.messages.currentVersion} position="top" withArrow>
                    <Group gap="xs">
                      <IconHistory size={16} className="text-gray-500" />
                      <Text size="sm" c="dimmed">
                        v{prompt.currentVersion}
                      </Text>
                    </Group>
                  </Tooltip>
                </Group>

                {/* Author and Date */}
                <Group gap="xl">
                  <Group gap="xs">
                    <IconUser size={16} className="text-gray-500" />
                    <Text size="sm">{prompt.author.name}</Text>
                  </Group>
                  <Group gap="xs">
                    <IconCalendar size={16} className="text-gray-500" />
                    <Text size="sm" c="dimmed">
                      {new Date(prompt.createdAt).toLocaleDateString('de-DE')}
                    </Text>
                  </Group>
                </Group>

                <Divider />

                {/* Prompt Content */}
                <div>
                  <Text size="sm" fw={600} mb="sm">
                    {texts.chat.prompts.labels.content}
                  </Text>
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      minRows={8}
                      maxRows={15}
                      required
                      placeholder={texts.chat.prompts.placeholders.enterContent}
                    />
                  ) : (
                    <Card withBorder p="md" className="bg-gray-50">
                      <div style={{ maxHeight: 300, overflow: 'auto' }}>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedVersion ? selectedVersion.content : prompt.content}
                        </Text>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Actions */}
                <Group gap="sm">
                  <Tooltip label={texts.chat.prompts.tooltips.useInChat} position="top" withArrow>
                    <Button
                      leftSection={<IconPlayerPlay size={16} />}
                      onClick={handleUsePrompt}
                      loading={usePromptMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {texts.chat.prompts.buttons.use}
                    </Button>
                  </Tooltip>
                  <Tooltip label={texts.chat.prompts.tooltips.clonePrompt} position="top" withArrow>
                    <Button
                      variant="light"
                      leftSection={<IconClone size={16} />}
                      onClick={handleClonePrompt}
                      loading={clonePromptMutation.isPending}
                    >
                      {texts.chat.prompts.buttons.clone}
                    </Button>
                  </Tooltip>
                  <Tooltip label={texts.chat.prompts.tooltips.copyToClipboard} position="top" withArrow>
                    <Button variant="light" leftSection={<IconCopy size={16} />} onClick={handleCopyPrompt}>
                      {texts.chat.prompts.buttons.toClipboard}
                    </Button>
                  </Tooltip>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="versions" pt="md">
              <Stack gap="lg">
                <Text size="sm" fw={600}>
                  {texts.chat.prompts.labels.versionHistory}
                </Text>
                {versions.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    {texts.chat.prompts.messages.noVersions}
                  </Text>
                ) : (
                  <Stack gap="sm">
                    {versions.map((version) => (
                      <Card
                        key={version.id}
                        withBorder
                        p="md"
                        className={`cursor-pointer transition-colors ${
                          selectedVersion?.id === version.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleVersionSelect(version)}
                      >
                        <Group justify="space-between" align="flex-start">
                          <div className="flex-1">
                            <Group gap="sm" mb="xs">
                              <Badge variant={version.isCurrent ? 'filled' : 'light'} color="blue" size="sm">
                                v{version.versionNumber}
                                {version.isCurrent && ` (${texts.chat.prompts.messages.current})`}
                              </Badge>
                              <Text size="sm" fw={500}>
                                {version.versionComment}
                              </Text>
                            </Group>
                            <Group gap="sm" mb="xs">
                              <Text size="xs" c="dimmed">
                                {version.author.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {new Date(version.createdAt).toLocaleDateString('de-DE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </Group>
                            {version.title !== prompt.title && (
                              <Text size="xs" c="dimmed">
                                Title: {version.title}
                              </Text>
                            )}
                          </div>
                          {!version.isCurrent && (
                            <Tooltip
                              label={texts.chat.prompts.messages.restoreVersion(version.versionNumber)}
                              position="top"
                              withArrow
                            >
                              <Button
                                size="xs"
                                variant="light"
                                leftSection={<IconRestore size={14} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreVersion(version.versionNumber);
                                }}
                                loading={restoreVersionMutation.isPending}
                              >
                                {texts.chat.prompts.buttons.restore}
                              </Button>
                            </Tooltip>
                          )}
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="ratings" pt="md">
              <Stack gap="lg">
                {/* Rating Overview */}
                <Card withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text size="xl" fw={700}>
                        {(Number(prompt.averageRating) || 0).toFixed(1)}
                      </Text>
                      <Rating value={prompt.averageRating || 0} readOnly size="sm" />
                      <Text size="xs" c="dimmed">
                        {totalRatings} {texts.chat.prompts.tabs.ratings}
                      </Text>
                    </div>
                    <div className="max-w-xs flex-1">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <Group key={star} gap="xs" mb="xs">
                          <Text size="xs" w={20}>
                            {star}★
                          </Text>
                          <Progress
                            value={
                              totalRatings > 0
                                ? (ratingDistribution[star as keyof typeof ratingDistribution] / totalRatings) * 100
                                : 0
                            }
                            size="sm"
                            className="flex-1"
                          />
                          <Text size="xs" c="dimmed" w={30}>
                            {ratingDistribution[star as keyof typeof ratingDistribution]}
                          </Text>
                        </Group>
                      ))}
                    </div>
                  </Group>

                  {/* Rate this prompt */}
                  {!myRating && (
                    <div>
                      <Divider mb="md" />
                      {!showRatingForm ? (
                        <Button variant="light" onClick={() => setShowRatingForm(true)} fullWidth>
                          {texts.chat.prompts.buttons.rateThisPrompt}
                        </Button>
                      ) : (
                        <Stack gap="sm">
                          <Text size="sm" fw={600}>
                            {texts.chat.prompts.labels.yourRating}
                          </Text>
                          <Rating value={userRating} onChange={setUserRating} size="lg" />
                          <Textarea
                            placeholder={texts.chat.prompts.placeholders.optionalComment}
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            minRows={2}
                            maxRows={4}
                          />
                          <Group gap="sm">
                            <Button
                              onClick={handleSubmitRating}
                              disabled={userRating === 0}
                              loading={ratePromptMutation.isPending}
                              size="sm"
                            >
                              {texts.chat.prompts.buttons.submitRating}
                            </Button>
                            <Button variant="subtle" onClick={() => setShowRatingForm(false)} size="sm">
                              {texts.chat.prompts.buttons.cancel}
                            </Button>
                          </Group>
                        </Stack>
                      )}
                    </div>
                  )}

                  {/* User's existing rating */}
                  {myRating && (
                    <div>
                      <Divider mb="md" />
                      <Text size="sm" fw={600} mb="sm">
                        {texts.chat.prompts.labels.yourRating}
                      </Text>
                      <Group gap="sm" mb="sm">
                        <Rating value={myRating.rating} readOnly size="sm" />
                        <Text size="sm" c="dimmed">
                          {new Date(myRating.createdAt).toLocaleDateString('de-DE')}
                        </Text>
                      </Group>
                      {myRating.comment && (
                        <Text size="sm" c="dimmed">
                          &ldquo;{myRating.comment}&rdquo;
                        </Text>
                      )}
                    </div>
                  )}
                </Card>

                {/* Individual Ratings */}
                {ratings.length > 0 && (
                  <div>
                    <Text size="sm" fw={600} mb="sm">
                      {texts.chat.prompts.labels.ratingsFromOthers}
                    </Text>
                    <Stack gap="sm">
                      {ratings
                        .filter((rating) => rating.userId !== myRating?.userId)
                        .slice(0, 5)
                        .map((rating) => (
                          <Card key={rating.id} withBorder p="sm">
                            <Group justify="space-between" mb="xs">
                              <Group gap="sm">
                                <Text size="sm" fw={500}>
                                  {rating.user.name}
                                </Text>
                                <Rating value={rating.rating} readOnly size="xs" />
                              </Group>
                              <Text size="xs" c="dimmed">
                                {new Date(rating.createdAt).toLocaleDateString('de-DE')}
                              </Text>
                            </Group>
                            {rating.comment && (
                              <Text size="sm" c="dimmed">
                                &ldquo;{rating.comment}&rdquo;
                              </Text>
                            )}
                          </Card>
                        ))}
                    </Stack>
                  </div>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Modal>

      <VersionCommentModal
        opened={showVersionCommentModal}
        onClose={handleVersionCommentClose}
        onSubmit={handleVersionCommentSubmit}
        title={versionCommentAction === 'update' ? 'Version Comment for Update' : 'Version Comment for Restore'}
        description={
          versionCommentAction === 'update'
            ? 'Briefly describe what was changed in this version.'
            : `Briefly describe why you are restoring version ${restoreVersionNumber}.`
        }
        loading={updatePromptMutation.isPending || restoreVersionMutation.isPending}
      />
    </>
  );
}
