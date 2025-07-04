import { useMutation, useQuery } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { AuthSettingsDto, useApi } from 'src/api';
import { LoginDto } from 'src/api/generated';
import { Forms, Logo } from 'src/components';
import { Theme, useLoginUrl, useTheme, useTransientNavigate } from 'src/hooks';
import { texts } from 'src/texts';

export function LoginPage() {
  const api = useApi();

  const { theme } = useTheme();
  const { data: authSettings, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.auth.getAuthSettings(),
  });

  return (
    <div className="text-primary flex h-screen overflow-hidden font-medium">
      <div className="bg-primary-content flex w-96 flex-none flex-col items-center justify-center p-8">
        <Sidebar theme={theme} authSettings={authSettings} error={isError} />
      </div>
      {theme.backgroundLogoUrl && <BackgroundImage logoUrl={theme.backgroundLogoUrl} />}
    </div>
  );
}

function Sidebar(props: { theme: Theme; authSettings?: AuthSettingsDto; error: true | false }) {
  return (
    <>
      <div className="flex h-1/4 w-full items-start justify-start p-4">
        {props.theme.logoUrl && <Logo size={{ height: '2rem' }} url={props.theme.logoUrl} />}
      </div>
      <div className="mb-4 flex grow flex-col items-center justify-center p-4">
        <LoginProviders welcomeText={props.theme.welcomeText} authSettings={props.authSettings} error={props.error} />
      </div>
      <div className="flex h-1/4 w-full items-end justify-start space-x-4 p-4 text-xs">
        <LegalFooter siteLinks={props.theme.siteLinks} />
      </div>
    </>
  );
}

function LoginProviders(props: { welcomeText?: string; authSettings: AuthSettingsDto | undefined; error: true | false }) {
  return (
    <>
      <h2 className="mb-4 w-full justify-start text-4xl font-medium">
        {renderTextWithBreaks(props.welcomeText || texts.login.welcome)}
      </h2>

      <div className="mb-4 w-full">
        {props.authSettings?.providers.map((p) => (
          <LoginButton key={p.name} name={p.name} label={p.displayName} />
        ))}
      </div>

      {props.authSettings?.enablePasswordAuth && <LoginForm />}

      <div className="mb-4 w-full text-sm">
        <div>{props.error && <LoginAuthError />}</div>
      </div>

      <div className="mb-4 w-full text-sm">
        <div>{props.authSettings?.providers.length === 0 && !props.authSettings.enablePasswordAuth && <NoAuthSettings />}</div>
      </div>
    </>
  );
}

function LoginForm() {
  const api = useApi();

  const navigate = useTransientNavigate();
  const login = useMutation({
    mutationFn: (request: LoginDto) => {
      return api.auth.login(request);
    },
    onSuccess: () => {
      navigate('/chat');
    },
  });

  const form = useForm<LoginDto>({});

  return (
    <FormProvider {...form}>
      {/* Form Section */}
      <form className="flex w-full flex-col text-black" onSubmit={form.handleSubmit((v) => login.mutate(v))}>
        {/* Error Message Placeholder */}
        {login.isError && (
          <div role={'alert'} className="alert alert-error mb-4">
            {texts.common.loginFailed}
          </div>
        )}

        <Forms.Text vertical name="email" placeholder={texts.common.email} autoFocus />

        <Forms.Password vertical name="password" placeholder={texts.common.password} />

        <button type="submit" className="btn btn-primary bg-primary w-full rounded px-4 py-1.5">
          {texts.common.loginButton}
        </button>
      </form>
    </FormProvider>
  );
}

function LoginButton({ label, name }: { label: string; name: string }) {
  const url = useLoginUrl(name);

  return (
    <a href={url} className="btn btn-primary bg-primary w-full rounded px-4 py-1.5">
      {texts.login.loginButton(label)}
    </a>
  );
}

const LoginAuthError = () => {
  return <p role={'alert'}>{texts.login.authError}</p>;
};

const NoAuthSettings = () => {
  return <p role={'alert'}>{texts.login.emptyAuthSettings}</p>;
};

const renderTextWithBreaks = (text: string) => {
  return text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      {index < text.split('\n').length - 1 && <br />}
    </span>
  ));
};

function LegalFooter(props: { siteLinks: { text: string; link: string }[] | undefined }) {
  return (
    <>
      {props.siteLinks?.map((siteLink) => (
        <div key={siteLink.text} className={'line-clamp-1'}>
          <a href={siteLink.link} className="link link-primary">
            {siteLink.text}
          </a>
        </div>
      ))}
    </>
  );
}

function BackgroundImage(props: { logoUrl: string }) {
  return <img className="flex-grow object-cover" src={props.logoUrl} alt="Background Logo" />;
}
