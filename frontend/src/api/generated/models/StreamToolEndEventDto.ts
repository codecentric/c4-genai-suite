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
import type { StreamToolInfoDto } from './StreamToolInfoDto';
import {
    StreamToolInfoDtoFromJSON,
    StreamToolInfoDtoFromJSONTyped,
    StreamToolInfoDtoToJSON,
} from './StreamToolInfoDto';

/**
 * 
 * @export
 * @interface StreamToolEndEventDto
 */
export interface StreamToolEndEventDto {
    /**
     * The tool info.
     * @type {StreamToolInfoDto}
     * @memberof StreamToolEndEventDto
     */
    tool: StreamToolInfoDto;
    /**
     * 
     * @type {string}
     * @memberof StreamToolEndEventDto
     */
    type: StreamToolEndEventDtoTypeEnum;
}


/**
 * @export
 */
export const StreamToolEndEventDtoTypeEnum = {
    ToolEnd: 'tool_end'
} as const;
export type StreamToolEndEventDtoTypeEnum = typeof StreamToolEndEventDtoTypeEnum[keyof typeof StreamToolEndEventDtoTypeEnum];


/**
 * Check if a given object implements the StreamToolEndEventDto interface.
 */
export function instanceOfStreamToolEndEventDto(value: object): value is StreamToolEndEventDto {
    if (!('tool' in value) || value['tool'] === undefined) return false;
    if (!('type' in value) || value['type'] === undefined) return false;
    return true;
}

export function StreamToolEndEventDtoFromJSON(json: any): StreamToolEndEventDto {
    return StreamToolEndEventDtoFromJSONTyped(json, false);
}

export function StreamToolEndEventDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): StreamToolEndEventDto {
    if (json == null) {
        return json;
    }
    return {
        
        'tool': StreamToolInfoDtoFromJSON(json['tool']),
        'type': json['type'],
    };
}

export function StreamToolEndEventDtoToJSON(value?: StreamToolEndEventDto | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'tool': StreamToolInfoDtoToJSON(value['tool']),
        'type': value['type'],
    };
}

