import { Parser } from 'expr-eval';
import z from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionSpec } from 'src/domain/extensions';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class CalculatorExtension implements Extension {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'calculator',
      title: this.i18n.t('texts.extensions.calculator.title'),
      logo: `
	<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="8 8 84 84">
	  <!-- Calculator body -->
	  <rect x="20" y="10" width="60" height="80" rx="5" ry="5" fill="#dddddd" stroke="#555555" stroke-width="2" />
	  <!-- Calculator display -->
	  <rect x="25" y="15" width="50" height="15" rx="2" ry="2" fill="#f5f5f5" stroke="#555555" stroke-width="1" />
	  <!-- Calculator buttons -->
	  <rect x="25" y="35" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="38" y="35" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="51" y="35" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="64" y="35" width="10" height="10" rx="2" ry="2" fill="#aaaaaa" stroke="#555555" stroke-width="1" />
	  <rect x="25" y="48" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="38" y="48" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="51" y="48" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="64" y="48" width="10" height="10" rx="2" ry="2" fill="#aaaaaa" stroke="#555555" stroke-width="1" />
	  <rect x="25" y="61" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="38" y="61" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="51" y="61" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="64" y="61" width="10" height="10" rx="2" ry="2" fill="#aaaaaa" stroke="#555555" stroke-width="1" />
	  <rect x="25" y="74" width="23" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="51" y="74" width="10" height="10" rx="2" ry="2" fill="#f0f0f0" stroke="#555555" stroke-width="1" />
	  <rect x="64" y="74" width="10" height="10" rx="2" ry="2" fill="#aaaaaa" stroke="#555555" stroke-width="1" />
	</svg>`,
      description: this.i18n.t('texts.extensions.calculator.description'),
      type: 'tool',
      arguments: {},
    };
  }

  getMiddlewares(): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.tools.push(new InternalTool());
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name = 'calculator';
  readonly description =
    'Useful for getting the result of a math expression. The input to this tool should be a valid mathematical expression that could be executed by a simple calculator.';
  readonly displayName = 'Calculator';

  get lc_id() {
    return [...this.lc_namespace, this.name];
  }

  readonly schema = z.object({
    input: z.string(),
  });

  protected async _call({ input }: z.infer<typeof this.schema>): Promise<string> {
    return Promise.resolve(String(Parser.evaluate(input)));
  }
}
