//@ts-nocheck
/* tslint:disable */
/* eslint-disable */
/**
 * c4 GenAI Suite
 * c4 GenAI Suite
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import type { ExtensionArgumentArraySpecDto } from './ExtensionArgumentArraySpecDto';
import {
    instanceOfExtensionArgumentArraySpecDto,
    ExtensionArgumentArraySpecDtoFromJSON,
    ExtensionArgumentArraySpecDtoFromJSONTyped,
    ExtensionArgumentArraySpecDtoToJSON,
} from './ExtensionArgumentArraySpecDto';
import type { ExtensionArgumentBooleanSpecDto } from './ExtensionArgumentBooleanSpecDto';
import {
    instanceOfExtensionArgumentBooleanSpecDto,
    ExtensionArgumentBooleanSpecDtoFromJSON,
    ExtensionArgumentBooleanSpecDtoFromJSONTyped,
    ExtensionArgumentBooleanSpecDtoToJSON,
} from './ExtensionArgumentBooleanSpecDto';
import type { ExtensionArgumentNumberSpecDto } from './ExtensionArgumentNumberSpecDto';
import {
    instanceOfExtensionArgumentNumberSpecDto,
    ExtensionArgumentNumberSpecDtoFromJSON,
    ExtensionArgumentNumberSpecDtoFromJSONTyped,
    ExtensionArgumentNumberSpecDtoToJSON,
} from './ExtensionArgumentNumberSpecDto';
import type { ExtensionArgumentObjectSpecDto } from './ExtensionArgumentObjectSpecDto';
import {
    instanceOfExtensionArgumentObjectSpecDto,
    ExtensionArgumentObjectSpecDtoFromJSON,
    ExtensionArgumentObjectSpecDtoFromJSONTyped,
    ExtensionArgumentObjectSpecDtoToJSON,
} from './ExtensionArgumentObjectSpecDto';
import type { ExtensionArgumentStringSpecDto } from './ExtensionArgumentStringSpecDto';
import {
    instanceOfExtensionArgumentStringSpecDto,
    ExtensionArgumentStringSpecDtoFromJSON,
    ExtensionArgumentStringSpecDtoFromJSONTyped,
    ExtensionArgumentStringSpecDtoToJSON,
} from './ExtensionArgumentStringSpecDto';

/**
 * @type ExtensionArgumentObjectSpecDtoPropertiesValue
 * 
 * @export
 */
export type ExtensionArgumentObjectSpecDtoPropertiesValue = { type: 'array' } & ExtensionArgumentArraySpecDto | { type: 'boolean' } & ExtensionArgumentBooleanSpecDto | { type: 'number' } & ExtensionArgumentNumberSpecDto | { type: 'object' } & ExtensionArgumentObjectSpecDto | { type: 'string' } & ExtensionArgumentStringSpecDto;

export function ExtensionArgumentObjectSpecDtoPropertiesValueFromJSON(json: any): ExtensionArgumentObjectSpecDtoPropertiesValue {
    return ExtensionArgumentObjectSpecDtoPropertiesValueFromJSONTyped(json, false);
}

export function ExtensionArgumentObjectSpecDtoPropertiesValueFromJSONTyped(json: any, ignoreDiscriminator: boolean): ExtensionArgumentObjectSpecDtoPropertiesValue {
    if (json == null) {
        return json;
    }
    switch (json['type']) {
        case 'array':
            return Object.assign({}, ExtensionArgumentArraySpecDtoFromJSONTyped(json, true), { type: 'array' } as const);
        case 'boolean':
            return Object.assign({}, ExtensionArgumentBooleanSpecDtoFromJSONTyped(json, true), { type: 'boolean' } as const);
        case 'number':
            return Object.assign({}, ExtensionArgumentNumberSpecDtoFromJSONTyped(json, true), { type: 'number' } as const);
        case 'object':
            return Object.assign({}, ExtensionArgumentObjectSpecDtoFromJSONTyped(json, true), { type: 'object' } as const);
        case 'string':
            return Object.assign({}, ExtensionArgumentStringSpecDtoFromJSONTyped(json, true), { type: 'string' } as const);
        default:
            throw new Error(`No variant of ExtensionArgumentObjectSpecDtoPropertiesValue exists with 'type=${json['type']}'`);
    }
}

export function ExtensionArgumentObjectSpecDtoPropertiesValueToJSON(value?: ExtensionArgumentObjectSpecDtoPropertiesValue | null): any {
    if (value == null) {
        return value;
    }
    switch (value['type']) {
        case 'array':
            return ExtensionArgumentArraySpecDtoToJSON(value);
        case 'boolean':
            return ExtensionArgumentBooleanSpecDtoToJSON(value);
        case 'number':
            return ExtensionArgumentNumberSpecDtoToJSON(value);
        case 'object':
            return ExtensionArgumentObjectSpecDtoToJSON(value);
        case 'string':
            return ExtensionArgumentStringSpecDtoToJSON(value);
        default:
            throw new Error(`No variant of ExtensionArgumentObjectSpecDtoPropertiesValue exists with 'type=${value['type']}'`);
    }

}

