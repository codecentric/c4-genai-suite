import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Tabs } from '@mantine/core';
import { IconLock, IconUser } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { UpsertUserDto, useApi } from 'src/api';
import { Forms, Modal } from 'src/components';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';

const PASSWORD_CHANGE_SCHEMA = Yup.object({
  currentPassword: Yup.string().label(texts.chat.settings.currentPassword).required(texts.common.required),
  password: Yup.string().label(texts.chat.settings.password).required(texts.common.required),
  passwordConfirm: Yup.string()
    .label(texts.chat.settings.passwordConfirm)
    .oneOf([Yup.ref('password'), '', undefined], texts.common.passwordsDoNotMatch)
    .required(texts.common.required),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PASSWORD_RESOLVER = yupResolver<any>(PASSWORD_CHANGE_SCHEMA);
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
    resolver: PASSWORD_RESOLVER,
    defaultValues: { currentPassword: '', password: '', passwordConfirm: '' },
  });

  const updatePassword = useMutation({
    mutationFn: async (request: { currentPassword?: string; password?: string }) => {
      const fullUserData = await api.users.getUser(profile.id);

      const updateData: UpsertUserDto = {
        name: fullUserData.name,
        email: fullUserData.email,
        userGroupId: fullUserData.userGroupId,
        password: request.password,
        apiKey: fullUserData.apiKey,
        currentPassword: request.currentPassword,
      };
      return api.users.putUser(profile.id, updateData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['profile'],
      });
      passwordForm.reset({ password: '', passwordConfirm: '' });
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

  useEffect(() => {
    if (!isOpen) {
      passwordForm.reset({ password: '', passwordConfirm: '' });
      updatePassword.reset();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const PersonalInfoSection = () => (
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
  );

  const SecuritySection = () => (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{texts.chat.settings.security}</h3>
      <FormProvider {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
          <div className="space-y-4">
            <Forms.Password
              name="currentPassword"
              label={texts.chat.settings.currentPassword}
              placeholder={texts.chat.settings.enterCurrentPassword}
            />
            <Forms.Password name="password" label={texts.common.password} placeholder={texts.chat.settings.enterNewPassword} />
            <Forms.Password
              name="passwordConfirm"
              label={texts.common.passwordConfirm}
              placeholder={texts.chat.settings.enterConfirmNewPassword}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={updatePassword.isPending}>
              {updatePassword.isPending ? texts.chat.settings.updatingPassword : texts.chat.settings.updatePassword}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );

  return (
    <Modal size="xl" header={<div className="flex items-center gap-4">{texts.chat.settings.header}</div>} onClose={onClose}>
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
          {activeTab === 'personal' && <PersonalInfoSection />}
          {activeTab === 'security' && <SecuritySection />}
        </div>
      </div>
    </Modal>
  );
}
