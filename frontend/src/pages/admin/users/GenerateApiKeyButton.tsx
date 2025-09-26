import { Button } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { texts } from 'src/texts';

export function GenerateApiKeyButton({ disabled }: { disabled?: boolean }) {
  const { setValue } = useFormContext();

  const generateKey = async () => {
    const encoder = new TextEncoder();

    const keyText = crypto.randomUUID();
    const keyBuffer = encoder.encode(keyText);

    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const keyResult = hashArray.map((c) => c.toString(16).padStart(2, '0')).join('');

    setValue('apiKey', keyResult);
  };

  return (
    <Button onClick={generateKey} disabled={disabled}>
      {texts.common.generate}
    </Button>
  );
}
