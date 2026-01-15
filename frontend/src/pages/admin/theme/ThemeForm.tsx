import { Button, ColorInput, Select, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { SettingsDto, useApi } from 'src/api';
import { CHAT_SUGGESTIONS_SCHEME, ChatSuggestions, FormAlert, MAX_SUGGESTIONS, SiteLinks } from 'src/components';
import { Markdown } from 'src/components/Markdown';
import { useTheme } from 'src/hooks';
import { texts } from 'src/texts';
import { i18next } from 'src/texts/i18n';

const SCHEME = z.object({
  // Optional array of chat suggestions.
  chatSuggestions: CHAT_SUGGESTIONS_SCHEME.optional(),
});

export function ThemeForm() {
  const api = useApi();
  const { refetch, setTheme } = useTheme();

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

  const form = useForm<SettingsDto>({
    validate: zod4Resolver(SCHEME) as (values: SettingsDto) => Record<string, string | null>,
    initialValues: settings ?? {
      chatSuggestions: [],
      siteLinks: [],
    },
    mode: 'controlled',
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (settings) {
      form.setValues(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Sync theme preview
  const formValues = form.getValues();
  useEffect(() => {
    setTheme({
      name: formValues.name,
      primaryColor: formValues.primaryColor,
      primaryContentColor: formValues.primaryContentColor,
    });

    return () => {
      setTheme({});
    };
  }, [setTheme, formValues.name, formValues.primaryColor, formValues.primaryContentColor]);

  return (
    <form onSubmit={form.onSubmit((v) => updating.mutate(v))}>
      <fieldset disabled={updating.isPending}>
        <FormAlert common={texts.theme.updateFailed} error={updating.error} />

        <FormRow name="language" label={texts.theme.language}>
          <Select
            id="language"
            data={[
              { label: texts.theme.languages.de, value: 'de' },
              { label: texts.theme.languages.en, value: 'en' },
            ]}
            key={form.key('language')}
            {...form.getInputProps('language')}
          />
        </FormRow>

        <FormRow name="name" label={texts.theme.appName} hints={texts.theme.appNameHints}>
          <TextInput id="name" key={form.key('name')} {...form.getInputProps('name')} />
        </FormRow>

        <FormRow name="welcomeText" label={texts.theme.welcomeText} hints={texts.theme.welcomeTextHints}>
          <Textarea id="welcomeText" autosize minRows={3} key={form.key('welcomeText')} {...form.getInputProps('welcomeText')} />
        </FormRow>

        <div className="h-4" />

        <FormRow name="primaryColor" label={texts.theme.primaryColor}>
          <ColorInput id="primaryColor" key={form.key('primaryColor')} {...form.getInputProps('primaryColor')} />
        </FormRow>

        <FormRow name="primaryContentColor" label={texts.theme.primaryContentColor}>
          <ColorInput
            id="primaryContentColor"
            key={form.key('primaryContentColor')}
            {...form.getInputProps('primaryContentColor')}
          />
        </FormRow>

        <FormRow name="customCss" label={texts.theme.customCss}>
          <Textarea id="customCss" autosize minRows={3} key={form.key('customCss')} {...form.getInputProps('customCss')} />
        </FormRow>

        <div className="h-4" />

        <FormRow name="agentName" label={texts.theme.agentName} hints={texts.theme.agentNameHints}>
          <TextInput id="agentName" key={form.key('agentName')} {...form.getInputProps('agentName')} />
        </FormRow>

        <FormRow name="chatFooter" label={texts.theme.footer} hints={texts.theme.footerHints}>
          <TextInput id="chatFooter" key={form.key('chatFooter')} {...form.getInputProps('chatFooter')} />
        </FormRow>

        <FormRow name="chatSuggestions" label={texts.theme.suggestions} hints={texts.theme.suggestionsHints(MAX_SUGGESTIONS)}>
          <ChatSuggestions name="chatSuggestions" form={form} />
        </FormRow>

        <FormRow name="siteLinks" label={texts.theme.links} hints={texts.theme.linksHints}>
          <SiteLinks name="siteLinks" form={form} />
        </FormRow>

        <FormRow>
          <Button radius={'md'} size="lg" type="submit">
            {texts.common.save}
          </Button>
        </FormRow>
      </fieldset>
    </form>
  );
}

function FormRow({ name, label, hints, children }: { name?: string; label?: string; hints?: string; children: React.ReactNode }) {
  return (
    <div className="form-row mb-4 flex flex-row">
      <label htmlFor={name} className="mt-3 w-48 shrink-0 text-sm font-semibold">
        {label}
      </label>
      <div className="min-w-0 grow">
        {children}
        {hints && (
          <div className="text-sm leading-6 text-slate-500">
            <Markdown>{hints}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
