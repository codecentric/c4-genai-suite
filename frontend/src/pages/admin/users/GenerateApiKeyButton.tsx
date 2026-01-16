import { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GenerateApiKeyButton({ disabled, form }: { disabled?: boolean; form: UseFormReturnType<any> }) {
  const generateKey = async () => {
    const encoder = new TextEncoder();

    const keyText = crypto.randomUUID();
    const keyBuffer = encoder.encode(keyText);

    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const keyResult = hashArray.map((c) => c.toString(16).padStart(2, '0')).join('');

    form.setFieldValue('apiKey', keyResult);
  };

  return (
    <button type="button" aria-label={texts.users.generateAPIKey} className="btn" onClick={generateKey} disabled={disabled}>
      {texts.common.generate}
    </button>
  );
}
