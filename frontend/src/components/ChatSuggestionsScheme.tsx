import { z } from 'zod';
import { texts } from 'src/texts';

export const MAX_SUGGESTIONS = 12;

export const CHAT_SUGGESTIONS_SCHEME = z
  .array(
    z.object({
      // Required title.
      title: z.string().min(1, texts.common.title),

      // Required subtitle.
      subtitle: z.string().min(1, texts.common.subtitle),

      // Required text.
      text: z.string().min(1, texts.common.text),
    }),
  )
  .max(MAX_SUGGESTIONS);
