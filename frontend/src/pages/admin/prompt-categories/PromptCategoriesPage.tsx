import { ActionIcon, Button, Card, ColorInput, Group, Modal, Stack, Table, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { CreatePromptCategoryDto, PromptCategory, UpdatePromptCategoryDto } from 'src/api/prompts';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  sortOrder: number;
}

export function PromptCategoriesPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PromptCategory | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<PromptCategory[]>({
    queryKey: ['prompt-categories'],
    queryFn: async (): Promise<PromptCategory[]> => {
      const response = await fetch('/api/admin/prompt-categories/with-counts');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json() as Promise<PromptCategory[]>;
    },
  });

  // Form for create/edit
  const form = useForm<CategoryFormData>({
    initialValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      sortOrder: 0,
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? texts.admin.promptCategories.nameValidation : null),
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePromptCategoryDto): Promise<PromptCategory> => {
      const response = await fetch('/api/admin/prompt-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create category');
      }
      return response.json() as Promise<PromptCategory>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt-categories'] });
      toast.success(texts.admin.promptCategories.createSuccess);
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: async (error) => {
      toast.error(await buildError(texts.admin.promptCategories.createError, error));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePromptCategoryDto }): Promise<PromptCategory> => {
      const response = await fetch(`/api/admin/prompt-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update category');
      }
      return response.json() as Promise<PromptCategory>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt-categories'] });
      toast.success(texts.admin.promptCategories.updateSuccess);
      setEditingCategory(null);
      form.reset();
    },
    onError: async (error) => {
      toast.error(await buildError(texts.admin.promptCategories.updateError, error));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/prompt-categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete category');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt-categories'] });
      toast.success(texts.admin.promptCategories.deleteSuccess);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.admin.promptCategories.deleteError, error));
    },
  });

  const handleSubmit = (values: CategoryFormData) => {
    const data = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      color: values.color,
      sortOrder: values.sortOrder,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: PromptCategory) => {
    setEditingCategory(category);
    form.setValues({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3b82f6',
      sortOrder: category.sortOrder,
    });
  };

  const handleDelete = (category: PromptCategory) => {
    if (window.confirm(texts.admin.promptCategories.deleteConfirmation(category.name))) {
      deleteMutation.mutate(category.id);
    }
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
    form.reset();
  };

  const isModalOpen = isCreateModalOpen || editingCategory !== null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Text size="xl" fw={700} mb="xs">
            {texts.admin.promptCategories.title}
          </Text>
          <Text size="sm" c="dimmed">
            {texts.admin.promptCategories.subtitle}
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
          loading={createMutation.isPending}
        >
          {texts.admin.promptCategories.newCategory}
        </Button>
      </div>

      <Card withBorder>
        {isLoading ? (
          <Text ta="center" py="xl">
            {texts.admin.promptCategories.loading}
          </Text>
        ) : categories.length === 0 ? (
          <Text ta="center" py="xl" c="dimmed">
            {texts.admin.promptCategories.noCategories}
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{texts.admin.promptCategories.tableHeaders.name}</Table.Th>
                <Table.Th>{texts.admin.promptCategories.tableHeaders.description}</Table.Th>
                <Table.Th>{texts.admin.promptCategories.tableHeaders.color}</Table.Th>
                <Table.Th>{texts.admin.promptCategories.tableHeaders.sortOrder}</Table.Th>
                <Table.Th>{texts.admin.promptCategories.tableHeaders.prompts}</Table.Th>
                <Table.Th>{texts.admin.promptCategories.tableHeaders.created}</Table.Th>
                <Table.Th style={{ width: 100 }}>{texts.admin.promptCategories.tableHeaders.actions}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.map((category) => (
                <Table.Tr key={category.id}>
                  <Table.Td>
                    <Text fw={500}>{category.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {category.description || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: category.color || '#3b82f6',
                          borderRadius: 4,
                          border: '1px solid #e0e0e0',
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {category.color || '#3b82f6'}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{category.sortOrder}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{category.promptCount || 0}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(category.createdAt).toLocaleDateString('de-DE')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleEdit(category)}
                        loading={updateMutation.isPending && editingCategory?.id === category.id}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDelete(category)}
                        loading={deleteMutation.isPending}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        opened={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? texts.admin.promptCategories.editModalTitle : texts.admin.promptCategories.createModalTitle}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label={texts.admin.promptCategories.nameLabel}
              placeholder={texts.admin.promptCategories.namePlaceholder}
              required
              {...form.getInputProps('name')}
            />

            <Textarea
              label={texts.admin.promptCategories.descriptionLabel}
              placeholder={texts.admin.promptCategories.descriptionPlaceholder}
              rows={3}
              {...form.getInputProps('description')}
            />

            <ColorInput
              label={texts.admin.promptCategories.colorLabel}
              placeholder={texts.admin.promptCategories.colorPlaceholder}
              {...form.getInputProps('color')}
            />

            <TextInput
              label={texts.admin.promptCategories.sortOrderLabel}
              placeholder={texts.admin.promptCategories.sortOrderPlaceholder}
              type="number"
              {...form.getInputProps('sortOrder')}
            />

            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={closeModal}>
                {texts.admin.promptCategories.cancel}
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingCategory ? texts.admin.promptCategories.update : texts.admin.promptCategories.create}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}
