import { ChatMiddleware, ExtensionUserArgumentValues } from '../chat';
import { ChatSuggestion } from '../shared';
import { User } from '../users';
import 'reflect-metadata';

export type ExtensionConfiguration = Record<string, any>;

export interface ConfigurationModel {
  id: number;

  name: string;

  description: string;

  enabled: boolean;

  agentName?: string;

  chatFooter?: string;

  chatSuggestions?: ChatSuggestion[];

  executorEndpoint?: string;

  executorHeaders?: string;

  userGroupsIds: string[];

  extensions?: ConfiguredExtension<ExtensionConfiguration>[];
}

export interface ConfigurationUserValuesModel {
  id: number;
  values: { [id: string]: ExtensionConfiguration };
  isDefault: boolean;
}

export interface ExtensionArgumentBase {
  type: ExtensionArgumentType;

  title: string;

  description?: string;

  required?: boolean;

  showInList?: boolean;

  documentationUrl?: string;
}

export const EXTENSION_STRING_ARGUMENT_FORMATS = ['input', 'textarea', 'password', 'select', 'date', 'email', 'c4-ui'] as const;

export type ExtensionStringArgumentFormat = (typeof EXTENSION_STRING_ARGUMENT_FORMATS)[number];

export interface ExtensionStringArgument extends ExtensionArgumentBase {
  type: 'string';

  format?: ExtensionStringArgumentFormat;

  examples?: string[];

  enum?: string[];

  default?: string;
}

export interface ExtensionObjectArgument extends ExtensionArgumentBase {
  type: 'object';

  properties: { [name: string]: ExtensionArgument };
}

export interface ExtensionArrayArgument extends ExtensionArgumentBase {
  type: 'array';

  items: ExtensionArgument;

  uniqueItems?: boolean;

  default?: any[];
}

export const EXTENSION_NUMBER_ARGUMENT_FORMATS = ['input', 'slider', 'bucket'] as const;

export type ExtensionNumberArgumentFormat = (typeof EXTENSION_NUMBER_ARGUMENT_FORMATS)[number];

export interface ExtensionNumberArgument extends ExtensionArgumentBase {
  type: 'number';

  format?: ExtensionNumberArgumentFormat;

  minimum?: number;

  maximum?: number;

  multipleOf?: number;

  default?: number;
}

export const EXTENSION_BOOLEAN_ARGUMENT_FORMATS = ['toggle'] as const;

export type ExtensionBooleanArgumentFormat = (typeof EXTENSION_BOOLEAN_ARGUMENT_FORMATS)[number];

export interface ExtensionBooleanArgument extends ExtensionArgumentBase {
  type: 'boolean';

  format?: ExtensionBooleanArgumentFormat;

  default?: boolean;
}

export type ExtensionArgument =
  | ExtensionArrayArgument
  | ExtensionObjectArgument
  | ExtensionStringArgument
  | ExtensionNumberArgument
  | ExtensionBooleanArgument;

export const EXTENSION_ARGUMENT_TYPES = ['string', 'number', 'boolean', 'object', 'array'] as const;

export type ExtensionArgumentType = (typeof EXTENSION_ARGUMENT_TYPES)[number];

export const EXTENSION_TYPES = ['tool', 'llm', 'other'] as const;

export type ExtensionType = (typeof EXTENSION_TYPES)[number];

export interface ExtensionSpec {
  // The unique name of the extension.
  name: string;

  // group of pairwise incompatible extensions (includes the extension with itself)
  group?: string;

  // group of exceptions to the group incompatible extensions
  groupWhitelist?: string[];

  title: string;

  description: string;

  // The logo as SVG.
  logo?: string;

  type: ExtensionType;

  arguments: { [name: string]: ExtensionArgument };

  userArguments?: ExtensionObjectArgument;

  triggers?: string[];
}

export type ExtensionState = {
  [param: string]: any;
  changed?: boolean;
  changes?: Record<string, any>[];
};

export type ExtensionEntity<T extends ExtensionConfiguration = ExtensionConfiguration> = {
  id: number;
  externalId: string;
  name: string;
  enabled?: boolean;
  values: T;
  state?: ExtensionState;
  configurableArguments?: ExtensionObjectArgument;
};

export class ConfiguredExtension<T extends ExtensionConfiguration = ExtensionConfiguration> {
  private constructor(
    private readonly entity: ExtensionEntity<T>,
    private readonly extension: Extension<T>,
    public readonly spec: ExtensionSpec,
  ) {}

  get enabled(): boolean {
    return this.entity.enabled ?? false;
  }

  get externalId(): string {
    return this.entity.externalId;
  }

  get name(): string {
    return this.entity.name;
  }

  get id(): number {
    return this.entity.id;
  }

  set id(id: number) {
    this.entity.id = id;
  }

  get testable(): boolean {
    return !!this.extension.test;
  }

  get dynamic(): boolean {
    return !!this.extension.buildSpec;
  }

  get values(): ExtensionConfiguration {
    return this.entity.values;
  }

  get changed(): boolean {
    return this.entity.state?.changed ?? false;
  }

  get configurableArguments(): ExtensionObjectArgument | undefined {
    return this.entity.configurableArguments;
  }

  async getChunks(documentUri: string, chunkUris: string[]): Promise<string[] | undefined> {
    return this.extension.getChunks?.(this.entity.values, documentUri, chunkUris);
  }

  async getDocument(documentUri: string, user: User): Promise<File | undefined> {
    return this.extension.getDocument?.(this.entity.values, documentUri, user);
  }

  private mergeExtensionUserValues(...extensionUserValues: (ExtensionUserArgumentValues | undefined)[]) {
    const merged: ExtensionConfiguration = {};
    extensionUserValues
      .filter((values) => values != null)
      .forEach((values) => {
        Object.entries(values).forEach(([key, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          merged[key] = value;
        });
      });

    return merged as T;
  }

  getMiddlewares(
    user: User,
    userArgumentValues?: ExtensionUserArgumentValues,
    ...argumentValues: ExtensionUserArgumentValues[]
  ): Promise<ChatMiddleware[]> {
    if (!this.extension.getMiddlewares) {
      return Promise.resolve([]);
    }
    this.entity.values = this.mergeExtensionUserValues(this.entity.values, ...argumentValues);

    return this.extension.getMiddlewares(user, this.entity, userArgumentValues);
  }

  public static async create<T extends ExtensionConfiguration>(
    this: void,
    extension: Extension<T>,
    entity: ExtensionEntity<T>,
    throwOnError: boolean = false,
    forceRebuild: boolean = false,
  ) {
    entity.state = entity.state ?? {};
    const spec = extension.buildSpec ? await extension.buildSpec(entity, throwOnError, forceRebuild) : extension.spec;
    return new ConfiguredExtension(entity, extension, spec);
  }

  public static createInitial<T extends ExtensionConfiguration>(this: void, extension: Extension<T>) {
    const spec = extension.spec;
    return new ConfiguredExtension({ id: 0, externalId: '', name: '', values: {} as T, state: {} }, extension, spec);
  }
}

export interface Extension<
  TConfig extends ExtensionConfiguration = ExtensionConfiguration,
  TUserValues extends ExtensionUserArgumentValues = ExtensionUserArgumentValues,
> {
  // the default spec
  spec: ExtensionSpec;

  // for dynamic specs
  buildSpec?(extension: ExtensionEntity<TConfig>, throwOnError: boolean, forceRebuild: boolean): Promise<ExtensionSpec>;

  getChunks?(configuration: TConfig, documentUri: string, chunkUris: string[]): Promise<string[]>;
  getDocument?(configuration: TConfig, documentUri: string, user: User): Promise<File>;

  fixedValues?: Partial<TConfig>;

  test?(configuration: TConfig): Promise<any>;

  getMiddlewares(user: User, extension: ExtensionEntity<TConfig>, userArgumentValues?: TUserValues): Promise<ChatMiddleware[]>;
}

export const EXTENSION_METADATA = 'EXTENSION';

export const Extension = (): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata(EXTENSION_METADATA, true, target);
  };
};
