import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { SettingsDto, useApi } from 'src/api';
import { CHAT_SUGGESTIONS_SCHEME, ChatSuggestions, FormAlert, Forms, MAX_SUGGESTIONS, SiteLinks } from 'src/components';
import { useTheme } from 'src/hooks';
import { texts } from 'src/texts';
import { i18next } from 'src/texts/i18n';

const SCHEME = z.object({
  // Optional array of chat suggestions.
  chatSuggestions: CHAT_SUGGESTIONS_SCHEME.optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RESOLVER = zodResolver(SCHEME) as any;

export function ThemeForm() {
  const api = useApi();
  const { refetch } = useTheme();

  const { data: settings } = useQuery({
    queryKey: ['editable-theme'],
    queryFn: () => api.settings.getSettings(),
  });

  const updating = useMutation({
    mutationFn: (request: SettingsDto) => {
      return api.settings.postSettings(request);
    },
    onSuccess: async (settings) => {
      if (settings.language != null) {
        await i18next.changeLanguage(settings.language);
      }

      toast(texts.common.saved, { type: 'success' });
      refetch();
    },
  });

  const form = useForm<SettingsDto>({ resolver: RESOLVER, defaultValues: settings });

  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((v) => updating.mutate(v))}>
        <fieldset disabled={updating.isPending}>
          <FormAlert common={texts.theme.updateFailed} error={updating.error} />

          <Forms.Select
            options={[
              { label: texts.theme.languages.de, value: 'de' },
              { label: texts.theme.languages.en, value: 'en' },
            ]}
            name="language"
            label={texts.theme.language}
          />

          <Forms.Text name="name" label={texts.theme.appName} hints={texts.theme.appNameHints} />

          <Forms.Textarea name="welcomeText" label={texts.theme.welcomeText} hints={texts.theme.welcomeTextHints} />

          <div className="h-4" />

          <Forms.Color name="primaryColor" className="w-auto" label={texts.theme.primaryColor} />

          <Forms.Color name="primaryContentColor" className="w-auto" label={texts.theme.primaryContentColor} />

          <Forms.Textarea name="customCss" label={texts.theme.customCss} />

          <div className="h-4" />

          <Forms.Text name="agentName" label={texts.theme.agentName} hints={texts.theme.agentNameHints} />

          <Forms.Text name="chatFooter" label={texts.theme.footer} hints={texts.theme.footerHints} />

          <Forms.Row name="chatSuggestions" label={texts.theme.suggestions} hints={texts.theme.suggestionsHints(MAX_SUGGESTIONS)}>
            <ChatSuggestions name="chatSuggestions" />
          </Forms.Row>

          <Forms.Row name="siteLinks" label={texts.theme.links} hints={texts.theme.linksHints}>
            <SiteLinks name="siteLinks" />
          </Forms.Row>

          <Forms.Row name="submit">
            <Button radius={'md'} size="lg" type="submit">
              {texts.common.save}
            </Button>
          </Forms.Row>

          <FormSync />
        </fieldset>
      </form>
    </FormProvider>
  );
}

function FormSync() {
  const formValue = useWatch<SettingsDto>();
  const { setTheme } = useTheme();

  const { name, primaryColor, primaryContentColor } = formValue;

  useEffect(() => {
    setTheme({ name, primaryColor, primaryContentColor });

    return () => {
      setTheme({});
    };
  }, [setTheme, name, primaryColor, primaryContentColor]);

  return null;
}
