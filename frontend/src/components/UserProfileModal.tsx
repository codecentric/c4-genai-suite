import { Button, PasswordInput, Tabs } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconLock, IconUser } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { ChangePasswordDto, useApi } from 'src/api';
import { Modal } from 'src/components';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';

const PASSWORD_CHANGE_SCHEMA = z
  .object({
    currentPassword: z.string().min(1, texts.common.required),
    password: z.string().min(1, texts.common.required),
    passwordConfirm: z.string().min(1, texts.common.required),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: texts.common.passwordsDoNotMatch,
    path: ['passwordConfirm'],
  });

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const profile = useProfile();
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');

  const passwordForm = useForm<{ currentPassword?: string; password?: string; passwordConfirm?: string }>({
    validate: zod4Resolver(PASSWORD_CHANGE_SCHEMA),
    initialValues: { currentPassword: '', password: '', passwordConfirm: '' },
    mode: 'controlled',
  });

  const updatePassword = useMutation({
    mutationFn: async (request: { currentPassword?: string; password?: string }) => {
      const payload: ChangePasswordDto = {
        password: request.password!,
        currentPassword: request.currentPassword!,
      };
      return api.users.putMyPassword(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['profile'],
      });
      passwordForm.reset();
      toast.success(texts.chat.settings.passwordUpdatedSuccessfully);
    },
    onError: () => {
      toast.error(texts.chat.settings.passwordUpdateFailed);
    },
  });

  const handlePasswordSubmit = (data: { currentPassword?: string; password?: string; passwordConfirm?: string }) => {
    if (data.password) {
      updatePassword.mutate({ password: data.password, currentPassword: data.currentPassword });
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      size="xl"
      header={<div className="flex items-center gap-4">{texts.chat.settings.header}</div>}
      onClose={() => {
        passwordForm.reset();
        updatePassword.reset();
        onClose();
      }}
    >
      <div className="flex h-96">
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <Tabs
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'personal' | 'security')}
            orientation="vertical"
            styles={{
              tab: {
                width: '100%',
                maxWidth: 'none',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                textAlign: 'left',
              },
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="personal" leftSection={<IconUser size={16} />}>
                {texts.chat.settings.personalInformation}
              </Tabs.Tab>
              <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
                {texts.chat.settings.security}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </div>

        <div className="w-2/3 pl-4">
          {activeTab === 'personal' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">{texts.chat.settings.personalInformation}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{texts.common.name}</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{texts.common.email}</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'security' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">{texts.chat.settings.security}</h3>
              <form onSubmit={passwordForm.onSubmit(handlePasswordSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <PasswordInput
                    id="currentPassword"
                    label={texts.chat.settings.currentPassword}
                    placeholder={texts.chat.settings.enterCurrentPassword}
                    key={passwordForm.key('currentPassword')}
                    {...passwordForm.getInputProps('currentPassword')}
                  />

                  <PasswordInput
                    id="password"
                    label={texts.common.password}
                    placeholder={texts.chat.settings.enterNewPassword}
                    key={passwordForm.key('password')}
                    {...passwordForm.getInputProps('password')}
                  />

                  <PasswordInput
                    id="passwordConfirm"
                    label={texts.common.passwordConfirm}
                    placeholder={texts.chat.settings.enterConfirmNewPassword}
                    key={passwordForm.key('passwordConfirm')}
                    {...passwordForm.getInputProps('passwordConfirm')}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updatePassword.isPending}>
                    {updatePassword.isPending ? texts.chat.settings.updatingPassword : texts.chat.settings.updatePassword}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
