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

import { mapValues } from '../runtime';
import type { ExtensionArgumentObjectSpecDto } from './ExtensionArgumentObjectSpecDto';
import {
    ExtensionArgumentObjectSpecDtoFromJSON,
    ExtensionArgumentObjectSpecDtoFromJSONTyped,
    ExtensionArgumentObjectSpecDtoToJSON,
} from './ExtensionArgumentObjectSpecDto';
import type { ExtensionSpecDto } from './ExtensionSpecDto';
import {
    ExtensionSpecDtoFromJSON,
    ExtensionSpecDtoFromJSONTyped,
    ExtensionSpecDtoToJSON,
} from './ExtensionSpecDto';

/**
 * 
 * @export
 * @interface ExtensionDto
 */
export interface ExtensionDto {
    /**
     * The ID of the extension.
     * @type {number}
     * @memberof ExtensionDto
     */
    id: number;
    /**
     * The name of the extension.
     * @type {string}
     * @memberof ExtensionDto
     */
    name: string;
    /**
     * The values.
     * @type {{ [key: string]: any; }}
     * @memberof ExtensionDto
     */
    values: { [key: string]: any; };
    /**
     * The arguments.
     * @type {ExtensionArgumentObjectSpecDto}
     * @memberof ExtensionDto
     */
    configurableArguments?: ExtensionArgumentObjectSpecDto;
    /**
     * Indicates whether the extension is enabled.
     * @type {boolean}
     * @memberof ExtensionDto
     */
    enabled: boolean;
    /**
     * Indicates whether the extension was changed.
     * @type {boolean}
     * @memberof ExtensionDto
     */
    changed: boolean;
    /**
     * The extension specs.
     * @type {ExtensionSpecDto}
     * @memberof ExtensionDto
     */
    spec: ExtensionSpecDto;
}

/**
 * Check if a given object implements the ExtensionDto interface.
 */
export function instanceOfExtensionDto(value: object): value is ExtensionDto {
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('name' in value) || value['name'] === undefined) return false;
    if (!('values' in value) || value['values'] === undefined) return false;
    if (!('enabled' in value) || value['enabled'] === undefined) return false;
    if (!('changed' in value) || value['changed'] === undefined) return false;
    if (!('spec' in value) || value['spec'] === undefined) return false;
    return true;
}

export function ExtensionDtoFromJSON(json: any): ExtensionDto {
    return ExtensionDtoFromJSONTyped(json, false);
}

export function ExtensionDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): ExtensionDto {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'],
        'name': json['name'],
        'values': json['values'],
        'configurableArguments': json['configurableArguments'] == null ? undefined : ExtensionArgumentObjectSpecDtoFromJSON(json['configurableArguments']),
        'enabled': json['enabled'],
        'changed': json['changed'],
        'spec': ExtensionSpecDtoFromJSON(json['spec']),
    };
}

export function ExtensionDtoToJSON(value?: ExtensionDto | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'id': value['id'],
        'name': value['name'],
        'values': value['values'],
        'configurableArguments': ExtensionArgumentObjectSpecDtoToJSON(value['configurableArguments']),
        'enabled': value['enabled'],
        'changed': value['changed'],
        'spec': ExtensionSpecDtoToJSON(value['spec']),
    };
}

