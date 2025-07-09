import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Rating,
  ScrollArea,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronDown,
  IconCopy,
  IconEye,
  IconLock,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconWorld,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from 'src/api';
import { Prompt } from 'src/api/prompts';
import { ProfileButton } from 'src/components';
import { texts } from 'src/texts';
import { useStateMutateRemoveAllChats } from '../state/listOfChats';
import { PromptDetailsModal } from './PromptDetailsModal';

interface PromptLibraryProps {
  onPromptSelect: (prompt: Prompt) => void;
  onCreatePrompt: () => void;
  searchTerm: string;
  selectedCategory: string | null;
  minRating: number;
  sortBy: string;
}

interface PromptSidebarProps {
  onCreatePrompt: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  minRating: number;
  setMinRating: (rating: number) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
}

export function PromptSidebar({
  onCreatePrompt,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  minRating,
  setMinRating,
  sortBy,
  setSortBy,
}: PromptSidebarProps) {
  const api = useApi();
  const removeAllChats = useStateMutateRemoveAllChats();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['prompt-categories'],
    queryFn: () => api.prompts.getCategoriesWithCounts(),
  });

  // Fetch prompts for count
  const { data: _promptsData } = useQuery({
    queryKey: ['prompts', searchTerm, selectedCategory, sortBy],
    queryFn: () => {
      const getSortParams = (sortBy: string) => {
        switch (sortBy) {
          case 'rating':
            return { sortBy: 'averageRating' as const, sortOrder: 'DESC' as const };
          case 'usage':
            return { sortBy: 'usageCount' as const, sortOrder: 'DESC' as const };
          case 'newest':
          default:
            return { sortBy: 'createdAt' as const, sortOrder: 'DESC' as const };
        }
      };

      const { sortBy: apiSortBy, sortOrder } = getSortParams(sortBy);

      return api.prompts.getPrompts({
        search: searchTerm || undefined,
        categoryId: selectedCategory && selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
        page: 1,
        limit: 12,
        sortBy: apiSortBy,
        sortOrder,
      });
    },
  });

  // Fetch total count for "All" category (only public prompts to match category counts)
  const { data: allPromptsData } = useQuery({
    queryKey: ['prompts-all-count'],
    queryFn: () => api.prompts.getPrompts({ page: 1, limit: 1 }),
  });

  // Category tabs data
  const categoryTabs = [
    { value: 'all', label: texts.chat.prompts.categories.all, count: allPromptsData?.total || 0 },
    ...categories.map((cat) => ({
      value: cat.id.toString(),
      label: cat.name,
      count: cat.promptCount || 0,
    })),
  ];

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header - Optimized */}
      <div className="border-b border-gray-200 bg-white p-4">
        <Text size="xl" fw={700} mb="md" className="text-gray-900">
          {texts.chat.prompts.library}
        </Text>

        {/* Primary Action Button - More prominent */}
        <Tooltip label={texts.chat.prompts.tooltips.createNew} position="top" withArrow>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onCreatePrompt}
            fullWidth
            size="md"
            className="mb-4 bg-blue-600 hover:bg-blue-700"
            radius="md"
          >
            {texts.chat.prompts.newPrompt}
          </Button>
        </Tooltip>

        {/* Enhanced Search */}
        <div className="relative">
          <TextInput
            placeholder={texts.chat.prompts.searchPlaceholder}
            leftSection={<IconSearch size={18} className="text-gray-400" />}
            rightSection={
              searchTerm && (
                <button
                  onClick={clearSearch}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700"
                  type="button"
                >
                  ×
                </button>
              )
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="md"
            radius="md"
            className="w-full"
            styles={{
              input: {
                fontSize: '14px',
                padding: '12px 16px',
                paddingLeft: '44px',
                paddingRight: searchTerm ? '44px' : '16px',
              },
            }}
          />
        </div>
      </div>

      {/* Filter Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Category Dropdown */}
        <div className="mb-6">
          <Text size="sm" fw={600} mb="sm">
            Kategorien
          </Text>
          <Select
            placeholder={texts.chat.prompts.categories.all}
            value={selectedCategory}
            onChange={setSelectedCategory}
            data={categoryTabs.map((tab) => ({
              value: tab.value,
              label: `${tab.label} (${tab.count})`,
            }))}
            rightSection={<IconChevronDown size={16} />}
            size="sm"
            radius="md"
            searchable
            clearable
            maxDropdownHeight={200}
            styles={{
              input: {
                fontSize: '14px',
              },
            }}
          />
        </div>

        {/* Collapsible Filter Sections */}
        <Accordion
          multiple
          defaultValue={['rating', 'sorting']}
          styles={{
            item: {
              border: 'none',
              marginBottom: '16px',
            },
            control: {
              padding: '8px 0',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
            },
            content: {
              padding: '12px 0 0 0',
            },
            chevron: {
              width: '16px',
              height: '16px',
            },
          }}
        >
          {/* Rating Section */}
          <Accordion.Item value="rating">
            <Accordion.Control>{texts.chat.prompts.rating}</Accordion.Control>
            <Accordion.Panel>
              <Text size="xs" c="dimmed" mb="xs">
                Mindestbewertung: {minRating.toFixed(1)}
              </Text>
              <Slider
                value={minRating}
                onChange={setMinRating}
                min={0}
                max={5}
                step={0.1}
                size="sm"
                color="blue"
                marks={[
                  { value: 0, label: '0' },
                  { value: 2.5, label: '2.5' },
                  { value: 5, label: '5' },
                ]}
                styles={{
                  mark: {
                    fontSize: '11px',
                    color: '#6b7280',
                  },
                  markLabel: {
                    fontSize: '11px',
                    color: '#6b7280',
                  },
                }}
                mb="sm"
              />
            </Accordion.Panel>
          </Accordion.Item>

          {/* Sorting Section */}
          <Accordion.Item value="sorting">
            <Accordion.Control>{texts.chat.prompts.sorting}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <label className="flex items-center gap-2">
                  <input type="radio" name="sort" checked={sortBy === 'newest'} onChange={() => setSortBy('newest')} />
                  <Text size="sm">{texts.chat.prompts.newestFirst}</Text>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="sort" checked={sortBy === 'rating'} onChange={() => setSortBy('rating')} />
                  <Text size="sm">{texts.chat.prompts.bestRating}</Text>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="sort" checked={sortBy === 'usage'} onChange={() => setSortBy('usage')} />
                  <Text size="sm">{texts.chat.prompts.mostUsed}</Text>
                </label>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      {/* Profile Button at the bottom */}
      <div className="p-2" onClick={(e) => e.stopPropagation()}>
        <ProfileButton section="chat" onClearConversations={removeAllChats.mutate} />
      </div>
    </div>
  );
}

export function PromptLibrary({ onPromptSelect, searchTerm, selectedCategory, minRating, sortBy }: PromptLibraryProps) {
  const api = useApi();
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);

  // Fetch prompts with search, category and rating filters
  const { data: promptsData, isLoading } = useQuery({
    queryKey: ['prompts-library', searchTerm, selectedCategory, minRating, sortBy],
    queryFn: () => {
      const getSortParams = (sortBy: string) => {
        switch (sortBy) {
          case 'rating':
            return { sortBy: 'averageRating' as const, sortOrder: 'DESC' as const };
          case 'usage':
            return { sortBy: 'usageCount' as const, sortOrder: 'DESC' as const };
          case 'newest':
          default:
            return { sortBy: 'createdAt' as const, sortOrder: 'DESC' as const };
        }
      };

      const { sortBy: apiSortBy, sortOrder } = getSortParams(sortBy);

      return api.prompts.getPrompts({
        search: searchTerm || undefined,
        categoryId: selectedCategory && selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        page: 1,
        limit: 12,
        sortBy: apiSortBy,
        sortOrder,
      });
    },
  });

  // Utility function to get prompt preview
  const getPromptPreview = (content: string, maxLength: number = 150): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const handlePromptUse = async (prompt: Prompt) => {
    try {
      await api.prompts.usePrompt(prompt.id);
      onPromptSelect(prompt);
    } catch (error) {
      console.error('Failed to use prompt:', error);
    }
  };

  const handleShowDetails = (promptId: number) => {
    setSelectedPromptId(promptId);
    setDetailsModalOpened(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpened(false);
    setSelectedPromptId(null);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Content - nur die Prompt-Karten */}
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            {texts.chat.prompts.messages.loading}
          </Text>
        ) : promptsData?.items.length === 0 ? (
          <Box ta="center" py="xl">
            <Text size="sm" c="dimmed" mb="xs">
              {texts.chat.prompts.noResults}
            </Text>
            <Text size="xs" c="dimmed">
              {texts.chat.prompts.noResultsHint}
            </Text>
          </Box>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {/* All prompts from API */}
            {promptsData?.items.map((prompt) => (
              <Card
                key={prompt.id}
                p="lg"
                withBorder
                className="flex h-full min-h-[320px] flex-col transition-shadow hover:shadow-lg"
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                {/* Header - Fixed height section */}
                <div className="mb-4">
                  <Group justify="space-between" align="flex-start" mb="sm">
                    <div className="min-w-0 flex-1">
                      <Text size="sm" fw={600} mb="xs" lineClamp={2} className="min-h-[2.5rem]">
                        {prompt.title}
                      </Text>
                      <div className="min-h-[2rem]">
                        {prompt.description && (
                          <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                            {prompt.description}
                          </Text>
                        )}
                      </div>
                      <Group gap="xs" mt="xs">
                        {prompt.category && (
                          <Badge size="xs" variant="light" color={prompt.category.color || 'blue'}>
                            {prompt.category.name}
                          </Badge>
                        )}
                        <Badge
                          size="xs"
                          variant="light"
                          color={prompt.isPublic ? 'green' : 'gray'}
                          leftSection={prompt.isPublic ? <IconWorld size={10} /> : <IconLock size={10} />}
                        >
                          {prompt.isPublic ? 'Öffentlich' : 'Privat'}
                        </Badge>
                      </Group>
                    </div>
                    <Tooltip label={texts.chat.prompts.tooltips.copyPrompt} position="top" withArrow>
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <IconCopy size={14} />
                      </button>
                    </Tooltip>
                  </Group>
                </div>

                {/* Content - Flexible height section */}
                <div className="mb-4 flex-1">
                  {prompt.content && (
                    <Box p="xs" className="rounded border-l-2 border-blue-200 bg-gray-50">
                      <Text size="xs" c="dimmed" mb="xs" fw={500}>
                        Vorschau:
                      </Text>
                      <Text size="xs" c="dark" lineClamp={4} className="font-mono">
                        {getPromptPreview(prompt.content, 200)}
                      </Text>
                    </Box>
                  )}
                </div>

                {/* Footer - Fixed height section at bottom */}
                <div className="mt-auto">
                  {/* Stats */}
                  <Group justify="space-between" align="center" mb="sm">
                    <Group gap="xs">
                      <Tooltip
                        label={texts.chat.prompts.messages.averageRating(
                          Number(prompt.averageRating) || 0,
                          prompt.ratingCount || 0,
                        )}
                        position="top"
                        withArrow
                      >
                        <Group gap={2}>
                          <Rating value={prompt.averageRating || 0} readOnly size="xs" />
                        </Group>
                      </Tooltip>
                      <Tooltip label={texts.chat.prompts.tooltips.currentVersion} position="top" withArrow>
                        <Text size="xs" c="dimmed">
                          v{prompt.currentVersion}
                        </Text>
                      </Tooltip>
                      <Tooltip label={texts.chat.prompts.tooltips.usageCount} position="top" withArrow>
                        <Group gap={2}>
                          <IconEye size={12} className="text-gray-500" />
                          <Text size="xs" c="dimmed">
                            {texts.chat.prompts.usageCount(prompt.usageCount)}
                          </Text>
                        </Group>
                      </Tooltip>
                    </Group>
                  </Group>

                  {/* Author and Date */}
                  <Group justify="space-between" align="center" mb="md">
                    <Text size="xs" c="dimmed">
                      {texts.chat.prompts.author(prompt.author.name)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {texts.chat.prompts.createdAt(new Date(prompt.createdAt).toLocaleDateString('de-DE'))}
                    </Text>
                  </Group>

                  {/* Actions - always at bottom */}
                  <Group gap="xs">
                    <Tooltip label={texts.chat.prompts.tooltips.showDetails} position="top" withArrow>
                      <Button
                        variant="light"
                        size="sm"
                        leftSection={<IconEye size={14} />}
                        flex={1}
                        onClick={() => handleShowDetails(prompt.id)}
                      >
                        {texts.chat.prompts.buttons.details}
                      </Button>
                    </Tooltip>
                    <Tooltip label={texts.chat.prompts.tooltips.useInChat} position="top" withArrow>
                      <Button
                        size="sm"
                        leftSection={<IconPlayerPlay size={14} />}
                        flex={1}
                        onClick={() => handlePromptUse(prompt)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {texts.chat.prompts.buttons.execute}
                      </Button>
                    </Tooltip>
                  </Group>
                </div>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>

      {/* Prompt Details Modal */}
      <PromptDetailsModal
        opened={detailsModalOpened}
        onClose={handleCloseDetails}
        promptId={selectedPromptId}
        onPromptSelect={onPromptSelect}
      />
    </div>
  );
}
