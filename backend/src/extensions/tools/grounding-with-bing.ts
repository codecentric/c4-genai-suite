import {
  AgentsClient,
  isOutputOfType,
  MessageTextContent,
  MessageTextUrlCitationAnnotation,
  ToolUtility,
} from '@azure/ai-agents';
import { delay } from '@azure/core-util';
import { DefaultAzureCredential } from '@azure/identity';
import { StructuredTool } from '@langchain/core/tools';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, Source } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class GroundingWithBingSearchExtension implements Extension<GroundingWithBingSearchExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'grounding-with-bing-search',
      title: this.i18n.t('texts.extensions.grounding-with-bing.title'),
      logo: '<svg width="2535" height="1024" viewBox="0 0 2535 1024" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M342.444 322.924C323.57 325.117 309.176 340.445 307.838 359.775C307.261 368.104 307.442 368.669 326.321 417.25C369.273 527.78 379.679 554.382 381.429 558.126C385.669 567.193 391.631 575.723 399.08 583.379C404.796 589.254 408.566 592.413 414.942 596.672C426.148 604.156 431.709 606.225 475.314 619.136C517.79 631.713 540.996 640.072 560.993 649.997C586.899 662.855 604.974 677.481 616.407 694.835C624.61 707.287 631.875 729.616 635.036 752.093C636.272 760.879 636.28 780.301 635.051 788.244C632.384 805.483 627.057 819.929 618.908 832.018C614.574 838.447 616.082 837.371 622.383 829.536C640.215 807.365 658.38 769.472 667.649 735.11C678.866 693.523 680.392 648.866 672.04 606.599C655.775 524.29 603.814 453.257 530.632 413.289C526.034 410.777 508.52 401.597 484.776 389.252C481.173 387.378 476.26 384.813 473.858 383.552C471.456 382.29 466.543 379.725 462.94 377.852C459.337 375.979 448.965 370.575 439.891 365.844C430.817 361.112 420.664 355.818 417.328 354.079C407.159 348.777 400.336 345.215 395.249 342.552C371.721 330.235 361.762 325.256 358.923 324.392C355.945 323.486 348.38 322.323 346.482 322.479C346.082 322.512 344.265 322.712 342.444 322.924Z" fill="url(#paint0_radial_2_35)"/><path d="M393.737 735.544C392.433 736.316 390.603 737.434 389.669 738.027C388.734 738.621 386.66 739.91 385.059 740.893C379.182 744.5 363.552 754.131 350.121 762.422C341.294 767.871 339.984 768.683 328.771 775.642C324.767 778.126 320.509 780.744 319.308 781.46C318.107 782.176 312.976 785.336 307.905 788.482C302.834 791.627 293.991 797.087 288.253 800.614C282.515 804.14 272.252 810.471 265.447 814.682C258.641 818.892 249.688 824.413 245.552 826.95C241.415 829.486 237.594 831.936 237.06 832.394C236.267 833.074 199.475 855.865 181.014 867.112C166.993 875.653 150.773 881.366 134.169 883.61C126.439 884.654 111.811 884.658 104.103 883.616C83.2021 880.794 63.9476 872.999 47.4576 860.687C40.9893 855.857 28.8117 843.689 24.1563 837.403C13.1855 822.592 6.08829 806.705 2.41258 788.729C1.56681 784.592 0.766658 781.099 0.635158 780.965C0.291606 780.618 0.912197 786.867 2.03165 795.037C3.19575 803.534 5.67635 815.824 8.3481 826.335C29.0233 907.68 87.8556 973.842 167.5 1005.32C190.434 1014.38 213.577 1020.09 238.758 1022.89C248.22 1023.95 275.003 1024.37 284.878 1023.62C330.165 1020.19 369.597 1006.86 410.049 981.295C413.652 979.018 420.421 974.75 425.091 971.809C429.762 968.869 435.657 965.131 438.193 963.504C440.728 961.876 443.785 959.953 444.986 959.231C446.187 958.508 448.589 956.999 450.324 955.876C452.059 954.754 459.483 950.058 466.822 945.441L496.17 926.904L506.247 920.539L506.61 920.31L507.72 919.609L508.248 919.275L515.667 914.589L541.307 898.394C573.977 877.865 583.719 870.658 598.897 855.79C605.225 849.593 614.765 839.013 615.239 837.67C615.335 837.397 617.031 834.781 619.007 831.857C627.039 819.972 632.395 805.413 635.051 788.244C636.28 780.301 636.272 760.879 635.036 752.093C632.647 735.106 627.219 715.838 621.367 703.569C611.77 683.451 591.326 665.171 561.957 650.449C553.848 646.384 545.474 642.664 544.539 642.713C544.096 642.736 516.766 659.441 483.806 679.837C450.846 700.233 422.24 717.936 420.239 719.178C418.237 720.421 414.798 722.522 412.596 723.846L393.737 735.544Z" fill="url(#paint1_radial_2_35)"/><path d="M0.141154 637.697L0.282367 779.752L2.12098 788.001C7.87013 813.792 17.8312 832.387 35.148 849.658C43.2933 857.782 49.5219 862.68 58.3485 867.903C77.0259 878.956 97.1276 884.409 119.146 884.399C142.207 884.387 162.156 878.635 182.713 866.07C186.182 863.95 199.775 855.581 212.919 847.472L236.817 832.729V664.186V495.643L236.81 341.457C236.805 243.089 236.625 184.67 236.314 180.087C234.354 151.286 222.309 124.809 202.055 104.782C195.839 98.6357 190.528 94.5305 174.706 83.6427C166.833 78.2244 152.421 68.2988 142.68 61.586C132.939 54.8727 116.89 43.8135 107.015 37.0094C97.1402 30.2058 83.056 20.4986 75.7167 15.4385C60.4272 4.89657 59.2306 4.16335 54.6087 2.50964C48.597 0.359048 42.2263 -0.430914 36.1695 0.223193C18.5163 2.12971 4.38462 14.8756 0.711338 32.2041C0.139722 34.9001 0.0344077 70.7794 0.027129 265.516L0.0188956 495.643H0L0.141154 637.697Z" fill="url(#paint2_linear_2_35)"/><path d="M993 811.415V209.867H1184.03C1242.19 209.867 1288.47 222.603 1322.43 248.074C1356.39 273.546 1373.37 306.658 1373.37 347.413C1373.37 381.374 1363.61 411.091 1344.5 436.562C1324.07 462.407 1295.99 481.129 1264.27 490.052V491.75C1305.87 496.42 1338.56 511.702 1363.18 538.023C1388.23 563.494 1400.54 597.456 1400.54 638.634C1400.54 690.002 1380.16 732.029 1339.83 763.444C1299.5 794.858 1248.14 811.415 1186.16 811.415H993ZM1092.76 290.102V461.184H1157.29C1192.1 461.184 1219.27 452.694 1238.8 436.987C1258.75 420.006 1268.51 397.082 1268.51 367.365C1268.51 315.573 1234.13 290.102 1165.36 290.102H1092.76ZM1092.76 541.419V731.605H1177.67C1215.02 731.605 1243.89 723.114 1263.84 706.133C1284.22 688.728 1294.41 664.955 1294.41 634.814C1294.41 572.409 1251.53 541.419 1164.93 541.419H1092.76ZM1522.38 291.8C1506.67 291.8 1492.66 286.281 1481.62 276.093C1470.16 265.904 1464.64 252.744 1464.64 236.612C1464.64 220.481 1470.16 207.32 1481.62 196.707C1493.09 186.094 1506.67 181 1522.8 181C1538.93 181 1552.94 186.094 1564.41 196.707C1575.87 207.32 1581.39 220.905 1581.39 236.612C1581.39 251.895 1575.87 264.631 1564.41 275.668C1552.94 286.281 1538.93 291.8 1522.38 291.8ZM1570.77 811.415H1473.56V381.799H1571.2L1570.77 811.415ZM2052.61 811.415H1955.39V569.437C1955.39 488.778 1926.95 448.873 1870.49 448.873C1840.77 448.873 1816.15 460.335 1796.62 482.835C1776.97 506.172 1766.68 535.975 1767.75 566.466V811.415H1670.11V381.799H1767.75V453.118H1769.45C1782.75 427.896 1802.83 406.896 1827.44 392.492C1852.05 378.088 1880.19 370.855 1908.69 371.61C1955.39 371.61 1991.05 386.893 2015.67 417.459C2040.29 447.6 2052.61 491.325 2052.61 549.06V811.415ZM2534.44 777.029C2534.44 934.526 2455.48 1013.49 2296.71 1013.49C2246.45 1014.64 2196.53 1005.09 2150.25 985.469V896.319C2196.94 923.488 2241.94 936.649 2283.97 936.649C2385.86 936.649 2437.22 886.555 2437.22 785.943V739.246H2435.52C2421.41 765.119 2400.33 786.513 2374.66 800.997C2349 815.481 2319.78 822.473 2290.34 821.179C2266.31 821.95 2242.43 817.227 2220.5 807.369C2198.58 797.51 2179.2 782.778 2163.83 764.293C2130 720.278 2112.99 665.633 2115.86 610.191C2115.86 537.174 2132.84 479.439 2167.65 436.138C2202.46 392.836 2249.16 371.61 2309.44 371.61C2365.9 371.61 2407.93 394.959 2435.52 441.232H2437.22V381.799H2534.86L2534.44 777.029ZM2438.07 614.861V558.824C2438.07 528.683 2427.88 502.787 2407.93 481.561C2398.53 471.126 2386.99 462.842 2374.09 457.274C2361.2 451.706 2347.26 448.985 2333.22 449.298C2296.28 449.298 2267.41 463.307 2246.61 490.476C2223.86 524.047 2212.82 564.187 2215.2 604.673C2215.2 647.125 2225.39 680.662 2244.91 706.133C2265.29 731.605 2291.61 743.916 2324.72 743.916C2358.69 743.916 2385.86 731.605 2406.66 707.831C2427.88 683.209 2438.07 652.644 2438.07 614.437V614.861Z" fill="#737373"/><defs><radialGradient id="paint0_radial_2_35" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(654.126 722.251) rotate(-130.909) scale(529.064 380.685)"><stop stop-color="#00CACC"/><stop offset="1" stop-color="#048FCE"/></radialGradient><radialGradient id="paint1_radial_2_35" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(88.8183 915.135) rotate(-23.1954) scale(572.26 953.69)"><stop stop-color="#00BBEC"/><stop offset="1" stop-color="#2756A9"/></radialGradient><linearGradient id="paint2_linear_2_35" x1="118.409" y1="0" x2="118.409" y2="884.399" gradientUnits="userSpaceOnUse"><stop stop-color="#00BBEC"/><stop offset="1" stop-color="#2756A9"/></linearGradient></defs></svg>',
      description: this.i18n.t('texts.extensions.bing.description'),
      type: 'tool',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
          description: this.i18n.t('texts.extensions.grounding-with-bing.apiKeyHint'),
        },
        projectEndpoint: {
          type: 'string',
          title: this.i18n.t('texts.extensions.grounding-with-bing.projectEndpoint'),
          required: true,
          description: this.i18n.t('texts.extensions.grounding-with-bing.projectEndpointHint'),
        },
        connectionId: {
          type: 'string',
          title: this.i18n.t('texts.extensions.grounding-with-bing.connectionId'),
          required: true,
          description: this.i18n.t('texts.extensions.grounding-with-bing.connectionIdHint'),
        },
      },
    };
  }

  getMiddlewares(
    _user: User,
    extension: ExtensionEntity<GroundingWithBingSearchExtensionConfiguration>,
  ): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.tools.push(new InternalTool(extension.values, extension.externalId, context));
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends StructuredTool {
  readonly name: string;
  readonly description: string;
  readonly displayName = 'Grounding with Bing Search';
  readonly projectEndpoint: string;
  readonly apiKey: string;
  readonly connectionId: string;
  private readonly logger = new Logger(InternalTool.name);

  get lc_id() {
    return [...this.lc_namespace, this.name];
  }

  readonly schema = z.object({
    query: z.string().describe('The search query.'),
  });

  constructor(
    private readonly configuration: GroundingWithBingSearchExtensionConfiguration,
    private readonly extensionExternalId: string,
    private readonly context: ChatContext,
  ) {
    super();

    this.name = extensionExternalId;

    this.projectEndpoint = configuration.projectEndpoint;
    this.apiKey = configuration.apiKey;
    this.connectionId = configuration.connectionId;

    this.description = 'Uses Grounding with Bing to get information from a web search.';
  }

  protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
    const { query } = arg;
    console.log(`Ground with query: ${query}`);

    // see also:
    // https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/bing-code-samples?pivots=javascript

    // TODO: Unfortunately, the Azure SDK does not support auth via an API token. (AzureKeyCredential(this.apiKey))
    //  So we need to implement auth via Entra somehow.
    const cred = new DefaultAzureCredential();
    const client = new AgentsClient(this.projectEndpoint, cred);

    // TODO remove debug logging
    console.log(`Made Client`);
    console.log(`endpoint: ${this.projectEndpoint}`);
    console.log(`connectionId: ${this.connectionId}`);
    console.log(cred);
    // console.log(client);

    // Create an Agent
    let agent;
    try {
      const bingTool = ToolUtility.createBingGroundingTool([{ connectionId: this.connectionId }]);
      agent = await client.createAgent('gpt-4.1-mini', {
        name: 'agent-for-bing',
        instructions: 'You are a helpful agent',
        tools: [bingTool.definition],
      });
      console.log(`Made Agent`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      this.logger.error(`Error creating agent: ${error}`);
      return Promise.resolve('Error');
    }

    // Create thread for communication
    const thread = await client.threads.create();
    console.log(`Made Thread`);

    // Create message to thread
    await client.messages.create(thread.id, 'user', query);
    console.log(`Made Message`);

    // Create and process agent run in thread with tools
    let run = await client.runs.create(thread.id, agent.id);
    let result = '';
    while (run.status === 'queued' || run.status === 'in_progress') {
      await delay(300);
      run = await client.runs.get(thread.id, run.id);
    }
    if (run.status === 'failed') {
      console.log(`Run failed: ${run.lastError?.message}`);
      result = 'Query failed: ${run.lastError?.message}';
    }
    console.log(`Run finished with status: ${run.status}`);

    // Delete the assistant when done
    await client.deleteAgent(agent.id);

    // Fetch and log all messages
    const messagesIterator = client.messages.list(thread.id);
    console.log(`Messages:`);

    // Get the first message
    const firstMessage = await messagesIterator.next();
    if (!firstMessage.done && firstMessage.value) {
      const agentMessage = firstMessage.value.content[0];
      if (isOutputOfType(agentMessage, 'text')) {
        const textContent = agentMessage as MessageTextContent;
        result += textContent.text.value;

        const annotations = textContent.text.annotations;
        const sources: Source[] = [];
        for (const annotation of annotations) {
          console.log('URL Citation Annotation:', annotation);
          const cite = annotation as MessageTextUrlCitationAnnotation;
          const source: Source = {
            title: cite.urlCitation.title ?? 'Search result',
            chunk: {
              content: textContent.text.value,
              score: 0,
            },
            document: {
              uri: cite.urlCitation.url,
              mimeType: 'text/html',
              link: cite.urlCitation.url,
            },
          };
          sources.push(source);
        }
        this.context.history?.addSources(this.extensionExternalId, sources);
      }
    }

    return Promise.resolve(result);
  }
}

type GroundingWithBingSearchExtensionConfiguration = ExtensionConfiguration & {
  projectEndpoint: string;
  apiKey: string;
  connectionId: string;
};
