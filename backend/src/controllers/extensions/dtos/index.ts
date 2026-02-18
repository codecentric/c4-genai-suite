import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ChatSuggestionDto } from 'src/controllers/shared';
import {
  ConfigurationModel,
  ConfigurationUserValuesModel,
  EXTENSION_ARGUMENT_TYPES,
  EXTENSION_BOOLEAN_ARGUMENT_FORMATS,
  EXTENSION_NUMBER_ARGUMENT_FORMATS,
  EXTENSION_STRING_ARGUMENT_FORMATS,
  EXTENSION_TYPES,
  ExtensionArgument,
  ExtensionArgumentType,
  ExtensionArrayArgument,
  ExtensionBooleanArgument,
  ExtensionBooleanArgumentFormat,
  ExtensionConfiguration,
  ExtensionNumberArgument,
  ExtensionNumberArgumentFormat,
  ExtensionObjectArgument,
  ExtensionStringArgument,
  ExtensionStringArgumentFormat,
  ExtensionType,
  GetBucketAvailabilityResponse,
} from 'src/domain/extensions';
import { ConfiguredExtension } from 'src/domain/extensions';

export class ExtensionArgumentSpecDto {
  @ApiProperty({
    description: 'The type of the argument.',
    required: true,
    enum: EXTENSION_ARGUMENT_TYPES,
  })
  type!: ExtensionArgumentType;

  @ApiProperty({
    description: 'The label of the argument.',
    required: true,
  })
  title!: string;

  @ApiProperty({
    description: 'True, if required.',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'True, if required.',
    required: false,
  })
  required?: boolean;

  @ApiProperty({
    description: 'True to show this property in lists.',
    required: false,
  })
  showInList?: boolean;

  @ApiProperty({
    description: 'URL to the documentation.',
    required: false,
  })
  documentationUrl?: string;
}

function getExtensionArgumentTypes(onlyPrimitives = false) {
  const types = ['ExtensionArgumentStringSpecDto', 'ExtensionArgumentNumberSpecDto', 'ExtensionArgumentBooleanSpecDto'];

  if (onlyPrimitives) {
    return types.map((x) => ({
      $ref: getSchemaPath(x),
    }));
  }

  return [...types, 'ExtensionArgumentArraySpecDto', 'ExtensionArgumentObjectSpecDto'].map((x) => ({
    $ref: getSchemaPath(x),
  }));
}

function getExtensionArgumentTypeMappings(onlyPrimitives = false) {
  const mappings = {
    string: getSchemaPath('ExtensionArgumentStringSpecDto'),
    number: getSchemaPath('ExtensionArgumentNumberSpecDto'),
    boolean: getSchemaPath('ExtensionArgumentBooleanSpecDto'),
  };

  if (onlyPrimitives) {
    return mappings;
  }

  return {
    ...mappings,
    object: getSchemaPath('ExtensionArgumentObjectSpecDto'),
    array: getSchemaPath('ExtensionArgumentArraySpecDto'),
  };
}

export class ExtensionArgumentStringSpecDto extends ExtensionArgumentSpecDto implements ExtensionStringArgument {
  type!: 'string';

  @ApiProperty({
    description: 'The editor.',
    required: false,
    enum: EXTENSION_STRING_ARGUMENT_FORMATS,
  })
  format?: ExtensionStringArgumentFormat;

  @ApiProperty({
    description: 'The examples.',
    required: false,
    type: [String],
  })
  examples?: string[];

  @ApiProperty({
    description: 'The allowed values.',
    required: false,
    type: [String],
  })
  enum?: string[];

  @ApiProperty({
    description: 'The selected value.',
    required: false,
    type: String,
  })
  default?: string;
}

export class ExtensionArgumentNumberSpecDto extends ExtensionArgumentSpecDto implements ExtensionNumberArgument {
  type!: 'number';

  @ApiProperty({
    description: 'The editor.',
    required: false,
    enum: EXTENSION_NUMBER_ARGUMENT_FORMATS,
  })
  format?: ExtensionNumberArgumentFormat;

  @ApiProperty({
    description: 'The minimum allowed value for numbers.',
    required: false,
  })
  minimum?: number;

  @ApiProperty({
    description: 'The maximum allowed value for numbers.',
    required: false,
  })
  maximum?: number;

  @ApiProperty({
    description: 'The multipleOf value for numbers.',
    required: false,
  })
  multipleOf?: number;

  @ApiProperty({
    description: 'The selected value.',
    required: false,
    type: Number,
  })
  default?: number;
}

export class ExtensionArgumentBooleanSpecDto extends ExtensionArgumentSpecDto implements ExtensionBooleanArgument {
  type!: 'boolean';

  @ApiProperty({
    description: 'The editor.',
    required: false,
    enum: EXTENSION_BOOLEAN_ARGUMENT_FORMATS,
  })
  format?: ExtensionBooleanArgumentFormat;

  @ApiProperty({
    description: 'The selected value.',
    required: false,
    type: Boolean,
  })
  default?: boolean;
}

export class ExtensionArgumentArraySpecDto extends ExtensionArgumentSpecDto implements ExtensionArrayArgument {
  type!: 'array';

  @ApiProperty({
    description: 'The properties.',
    required: true,
    type: Object,
    oneOf: getExtensionArgumentTypes(false),
    discriminator: {
      propertyName: 'type',
      mapping: getExtensionArgumentTypeMappings(false),
    },
  })
  items!: ExtensionArgument;

  @ApiProperty({
    description: 'True, if items should be unique.',
    required: false,
  })
  uniqueItems?: boolean;

  @ApiProperty({
    description: 'The selected value.',
    required: false,
    type: [Object], // 'Object' represents 'any' in Swagger
  })
  default?: any[];
}

export class ExtensionArgumentObjectSpecDto extends ExtensionArgumentSpecDto implements ExtensionObjectArgument {
  type!: 'object';

  @ApiProperty({
    description: 'The properties.',
    required: true,
    additionalProperties: {
      oneOf: getExtensionArgumentTypes(false),
      discriminator: {
        propertyName: 'type',
        mapping: getExtensionArgumentTypeMappings(false),
      },
    },
  })
  properties!: Record<string, ExtensionArgument>;
}

@ApiExtraModels(
  ExtensionArgumentStringSpecDto,
  ExtensionArgumentNumberSpecDto,
  ExtensionArgumentBooleanSpecDto,
  ExtensionArgumentArraySpecDto,
  ExtensionArgumentObjectSpecDto,
)
export class ExtensionSpecDto {
  @ApiProperty({
    description: 'The name of the extension.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The group of pairwise incompatible tools.',
    required: false,
  })
  group?: string;

  @ApiProperty({
    description: 'Whitelist of compatible tools within the group.',
    required: false,
  })
  groupWhitelist?: string[];

  @ApiProperty({
    description: 'The display title.',
    required: true,
  })
  title!: string;

  @ApiProperty({
    description: 'The optional description.',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'The optional logo as SVG.',
    required: false,
  })
  logo?: string;

  @ApiProperty({
    description: 'Indicates if the extension can be tested.',
    required: true,
  })
  testable!: boolean;

  @ApiProperty({
    description: 'When spec is dynamic, triggers is used to rebuild the spec.',
    required: false,
  })
  triggers?: string[];

  @ApiProperty({
    description: 'The type of the extension.',
    required: true,
    enum: EXTENSION_TYPES,
  })
  type!: ExtensionType;

  @ApiProperty({
    description: 'The arguments.',
    required: true,
    additionalProperties: {
      oneOf: getExtensionArgumentTypes(false),
      discriminator: {
        propertyName: 'type',
        mapping: getExtensionArgumentTypeMappings(false),
      },
    },
  })
  arguments!: Record<string, ExtensionArgument>;

  static fromDomain(this: void, source: ConfiguredExtension) {
    const spec = source.spec;

    const result = new ExtensionSpecDto();
    result.arguments = {};
    result.description = spec.description;
    result.logo = spec.logo;
    result.name = spec.name;
    result.testable = source.testable;
    result.title = spec.title;
    result.type = spec.type;
    result.group = spec.group;
    result.groupWhitelist = spec.groupWhitelist;
    result.triggers = source.dynamic ? spec.triggers : undefined;

    for (const [name, arg] of Object.entries(spec.arguments)) {
      result.arguments[name] = arg;
    }

    return result;
  }
}

export class TestExtensionDto {
  @ApiProperty({
    description: 'The id of the extension.',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({
    description: 'The name of the extension.',
    required: true,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'The values.',
    required: true,
    additionalProperties: true,
  })
  @IsDefined()
  @IsObject()
  values!: ExtensionConfiguration;
}

export class UpdateExtensionDto {
  @ApiProperty({
    description: 'The values.',
    required: true,
    additionalProperties: true,
  })
  @IsDefined()
  @IsObject()
  values!: ExtensionConfiguration;

  @ApiProperty({
    description: 'The arguments.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  configurableArguments?: ExtensionArgumentObjectSpecDto;

  @ApiProperty({
    description: 'Indicates whether the extension is enabled.',
    required: false,
  })
  @IsBoolean()
  enabled?: boolean;
}

export class CreateExtensionDto {
  @ApiProperty({
    description: 'The name of the extension.',
    required: true,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'The values.',
    required: true,
    additionalProperties: true,
  })
  @IsDefined()
  @IsObject()
  values!: ExtensionConfiguration;

  @ApiProperty({
    description: 'The arguments.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  configurableArguments?: ExtensionArgumentObjectSpecDto;

  @ApiProperty({
    description: 'Indicates whether the extension is enabled.',
    required: true,
  })
  @IsDefined()
  @IsBoolean()
  enabled!: boolean;
}

export class ExtensionDto {
  @ApiProperty({
    description: 'The ID of the extension.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The name of the extension.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The values.',
    required: true,
    additionalProperties: true,
  })
  values!: ExtensionConfiguration;

  @ApiProperty({
    description: 'The arguments.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  configurableArguments?: ExtensionArgumentObjectSpecDto;

  @ApiProperty({
    description: 'Indicates whether the extension is enabled.',
    required: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'Indicates whether the extension was changed.',
    required: true,
  })
  changed!: boolean;

  @ApiProperty({
    description: 'The extension specs.',
    required: true,
    type: ExtensionSpecDto,
  })
  spec!: ExtensionSpecDto;

  static fromDomain(this: void, source: ConfiguredExtension) {
    const result = new ExtensionDto();
    result.id = source.id;
    result.enabled = source.enabled;
    result.changed = source.changed;
    result.name = source.spec.name;
    result.values = source.values;
    result.spec = ExtensionSpecDto.fromDomain(source);
    result.configurableArguments = source.configurableArguments;

    return result;
  }
}

export class ExtensionsDto {
  @ApiProperty({
    description: 'The configured extensions.',
    required: true,
    type: [ExtensionDto],
  })
  configured!: ExtensionDto[];

  @ApiProperty({
    description: 'The extension specs.',
    required: true,
    type: [ExtensionSpecDto],
  })
  specs!: ExtensionSpecDto[];

  static fromDomain(source: ConfiguredExtension[], extensions: ConfiguredExtension[]) {
    const result = new ExtensionsDto();
    result.configured = source.map(ExtensionDto.fromDomain);
    result.specs = extensions.map(ExtensionSpecDto.fromDomain);

    return result;
  }
}

@ApiExtraModels(ExtensionArgumentSpecDto)
export class ExtensionUserInfoDto {
  @ApiProperty({
    description: 'The name of the extension.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The ID of the extension within the configuration.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The display title.',
    required: true,
  })
  title!: string;

  @ApiProperty({
    description: 'The optional description.',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'The logo as SVG.',
    required: false,
  })
  logo?: string;

  @ApiProperty({
    description: 'The type of the extension.',
    required: true,
    enum: EXTENSION_TYPES,
  })
  type!: ExtensionType;

  @ApiProperty({
    description: 'The user arguments.',
    required: true,
    additionalProperties: {
      oneOf: getExtensionArgumentTypes(false),
      discriminator: {
        propertyName: 'type',
        mapping: getExtensionArgumentTypeMappings(false),
      },
    },
  })
  userArguments!: Record<string, ExtensionArgument>;

  @ApiProperty({
    description: 'The arguments.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  configurableArguments?: ExtensionArgumentObjectSpecDto;

  static fromDomain(source: ConfiguredExtension) {
    const spec = source.spec;

    const result = new ExtensionUserInfoDto();
    result.userArguments = {};
    result.configurableArguments = source.configurableArguments;
    result.id = source.id;
    result.description = spec.description;
    result.logo = spec.logo;
    result.name = spec.name;
    result.type = spec.type;

    const userArguments = spec.userArguments;
    result.title = userArguments?.title ?? spec.title;
    result.description = userArguments?.description ?? spec.description;

    for (const [name, arg] of Object.entries(userArguments?.properties ?? {})) {
      result.userArguments[name] = arg;
    }

    return result;
  }
}

@ApiExtraModels(ChatSuggestionDto)
export class UpsertConfigurationDto {
  @ApiProperty({
    description: 'The name of the configuration.',
    required: true,
  })
  @IsDefined()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'The description of the configuration.',
    required: true,
  })
  @IsDefined()
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Indicates whether the configuration is enabled.',
    required: true,
  })
  @IsDefined()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({
    description: 'The name of the agent.',
    required: false,
  })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiProperty({
    description: 'The footer text to be shown below the chat.',
    required: false,
  })
  @IsOptional()
  @IsString()
  chatFooter?: string;

  @ApiProperty({
    description: 'The optional executor endpoint.',
    required: false,
  })
  @IsOptional()
  @IsString()
  executorEndpoint?: string;

  @ApiProperty({
    description: 'The optional executor headers.',
    required: false,
  })
  @IsOptional()
  @IsString()
  executorHeaders?: string;

  @ApiProperty({
    description: 'The allowed user groups.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userGroupIds?: string[];

  @ApiProperty({
    description: 'The suggestions to be shown for the chat.',
    required: false,
    type: [ChatSuggestionDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatSuggestionDto)
  chatSuggestions?: ChatSuggestionDto[];
}

export class ConfigurationUserValuesDto {
  @ApiProperty({
    description: 'The values.',
    required: true,
    additionalProperties: true,
  })
  @IsDefined()
  @IsObject()
  values!: ExtensionConfiguration;

  static fromDomain(this: void, source?: ConfigurationUserValuesModel) {
    const result = new ConfigurationUserValuesDto();
    result.values = source?.values ?? {};
    return result;
  }
}

@ApiExtraModels(ChatSuggestionDto, ExtensionUserInfoDto)
export class ConfigurationDto {
  @ApiProperty({
    description: 'The ID of the configuration.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The name of the configuration.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The description of the configuration.',
    required: true,
  })
  description!: string;

  @ApiProperty({
    description: 'Indicates whether the configuration is enabled.',
    required: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'The name of the agent.',
    required: false,
  })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiProperty({
    description: 'The footer text to be shown below the chat.',
    required: false,
  })
  chatFooter?: string;

  @ApiProperty({
    description: 'The suggestions to be shown for the chat.',
    required: false,
    type: [ChatSuggestionDto],
  })
  chatSuggestions?: ChatSuggestionDto[];

  @ApiProperty({
    description: 'The optional executor endpoint.',
    required: false,
  })
  executorEndpoint?: string;

  @ApiProperty({
    description: 'The optional executor headers.',
    required: false,
  })
  executorHeaders?: string;

  @ApiProperty({
    description: 'The allowed user groups.',
    required: false,
    type: [String],
  })
  userGroupIds?: string[];

  @ApiProperty({
    description: 'Extension information.',
    required: false,
    type: [ExtensionUserInfoDto],
  })
  extensions?: ExtensionUserInfoDto[];

  @ApiProperty({
    description: 'Configurable arguments.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  configurableArguments?: ExtensionArgumentObjectSpecDto;

  static mergeConfigurableArguments(this: void, source: ConfigurationModel) {
    const configurableArguments = source.extensions?.reduce(
      (prev, curr) => {
        if (curr.configurableArguments) {
          prev.properties[String(curr.id)] = curr.configurableArguments;
        }

        return prev;
      },
      { type: 'object', title: source.name, properties: {} } as ExtensionArgumentObjectSpecDto,
    );

    return Object.keys(configurableArguments?.properties ?? {}).length ? configurableArguments : undefined;
  }

  static fromDomain(this: void, source: ConfigurationModel) {
    const result = new ConfigurationDto();
    result.id = source.id;
    result.agentName = source.agentName;
    result.chatFooter = source.chatFooter;
    result.chatSuggestions = source.chatSuggestions;
    result.enabled = source.enabled;
    result.executorEndpoint = source.executorEndpoint;
    result.executorHeaders = source.executorHeaders;
    result.name = source.name;
    result.description = source.description;
    result.userGroupIds = source.userGroupIds;
    result.extensions = source.extensions?.map((arg) => ExtensionUserInfoDto.fromDomain(arg));
    result.configurableArguments = ConfigurationDto.mergeConfigurableArguments(source);

    return result;
  }
}

export class ConfigurationsDto {
  @ApiProperty({
    description: 'The defined configurations.',
    required: true,
    type: [ConfigurationDto],
  })
  items!: ConfigurationDto[];

  static fromDomain(source: ConfigurationModel[]) {
    const result = new ConfigurationsDto();
    result.items = source.map(ConfigurationDto.fromDomain);

    return result;
  }
}

export class ExtensionBucketSettingsDto {
  @ApiProperty({
    description: 'The extension name',
    required: true,
  })
  title!: string;

  @ApiProperty({
    description: 'The extension id',
    required: true,
  })
  extensionId!: number;

  @ApiProperty({
    description: 'The max files that are allowed for the whole conversation',
    required: false,
  })
  maxFiles?: number;

  @ApiProperty({
    description: 'The filename extensions.',
    required: true,
    isArray: true,
    type: 'string',
  })
  fileNameExtensions!: string[];
}

export class BucketAvailabilityDto {
  @ApiProperty({
    description: 'The file types.',
    required: true,
    isArray: true,
    type: ExtensionBucketSettingsDto,
  })
  extensions!: ExtensionBucketSettingsDto[];

  static fromDomain(source: GetBucketAvailabilityResponse) {
    const result = new BucketAvailabilityDto();
    result.extensions = source.extensions;
    return result;
  }
}

export class ExportedExtensionDto {
  @ApiProperty({
    description: 'The name of the extension.',
    required: true,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Indicates whether the extension is enabled.',
    required: true,
  })
  @IsDefined()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({
    description: 'The configuration values.',
    required: true,
    additionalProperties: true,
  })
  @IsDefined()
  @IsObject()
  values!: Record<string, any>;

  @ApiProperty({
    description: 'Configurable arguments.',
    required: false,
    type: ExtensionArgumentObjectSpecDto,
  })
  @IsOptional()
  configurableArguments?: ExtensionArgumentObjectSpecDto;
}

export class ExportedConfigurationDto {
  @ApiProperty({
    description: 'The version of the application that exported this configuration.',
    required: false,
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({
    description: 'The timestamp when this configuration was exported.',
    required: false,
  })
  @IsOptional()
  @IsString()
  exportedAt?: string;

  @ApiProperty({
    description: 'The ID of the original configuration from which this was exported.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  originId?: number;

  @ApiProperty({
    description: 'The name of the configuration.',
    required: true,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'The description of the configuration.',
    required: true,
  })
  @IsDefined()
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Indicates whether the configuration is enabled.',
    required: true,
  })
  @IsDefined()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({
    description: 'The name of the agent.',
    required: false,
  })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiProperty({
    description: 'The footer text to be shown below the chat.',
    required: false,
  })
  @IsOptional()
  @IsString()
  chatFooter?: string;

  @ApiProperty({
    description: 'The suggestions to be shown for the chat.',
    required: false,
    type: [ChatSuggestionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatSuggestionDto)
  chatSuggestions?: ChatSuggestionDto[];

  @ApiProperty({
    description: 'The optional executor endpoint.',
    required: false,
  })
  @IsOptional()
  @IsString()
  executorEndpoint?: string;

  @ApiProperty({
    description: 'The optional executor headers.',
    required: false,
  })
  @IsOptional()
  @IsString()
  executorHeaders?: string;

  @ApiProperty({
    description: 'The allowed user groups.',
    required: true,
    type: [String],
  })
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  userGroupIds!: string[];

  @ApiProperty({
    description: 'The extensions configurations.',
    required: true,
    type: [ExportedExtensionDto],
  })
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportedExtensionDto)
  extensions!: ExportedExtensionDto[];
}

export class ImportConfigurationDto {
  @ApiProperty({
    description: 'The configuration data to import.',
    required: true,
    type: ExportedConfigurationDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ExportedConfigurationDto)
  data!: ExportedConfigurationDto;
}
