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


import * as runtime from '../runtime';
import type {
  BucketDto,
  BucketsDto,
  FileDto,
  FileTypesDto,
  FilesDto,
  TestBucketDto,
  UpsertBucketDto,
} from '../models/index';
import {
    BucketDtoFromJSON,
    BucketDtoToJSON,
    BucketsDtoFromJSON,
    BucketsDtoToJSON,
    FileDtoFromJSON,
    FileDtoToJSON,
    FileTypesDtoFromJSON,
    FileTypesDtoToJSON,
    FilesDtoFromJSON,
    FilesDtoToJSON,
    TestBucketDtoFromJSON,
    TestBucketDtoToJSON,
    UpsertBucketDtoFromJSON,
    UpsertBucketDtoToJSON,
} from '../models/index';

export interface DeleteBucketRequest {
    id: number;
}

export interface DeleteFileRequest {
    id: number;
    fileId: number;
}

export interface DeleteUserFileRequest {
    fileId: number;
}

export interface GetBucketRequest {
    id: number;
}

export interface GetFileTypesRequest {
    endpoint: string;
    headers?: string;
}

export interface GetFilesRequest {
    id: number;
    page?: number;
    pageSize?: number;
    query?: string;
}

export interface GetUserFilesRequest {
    page?: number;
    pageSize?: number;
    query?: string;
    conversationId?: number;
}

export interface PostBucketRequest {
    upsertBucketDto: UpsertBucketDto;
}

export interface PostFileRequest {
    id: number;
    file?: Blob;
}

export interface PostUserFileRequest {
    extensionId: number;
    conversationId?: number;
    file?: Blob;
}

export interface PutBucketRequest {
    id: number;
    upsertBucketDto: UpsertBucketDto;
}

export interface PutFileRequest {
    id: number;
    fileId: number;
    file?: Blob;
}

export interface TestBucketRequest {
    testBucketDto: TestBucketDto;
}

/**
 * 
 */
export class FilesApi extends runtime.BaseAPI {

    /**
     * Deletes an bucket.
     * 
     */
    async deleteBucketRaw(requestParameters: DeleteBucketRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling deleteBucket().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/buckets/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Deletes an bucket.
     * 
     */
    async deleteBucket(id: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.deleteBucketRaw({ id: id }, initOverrides);
    }

    /**
     * Deletes a file.
     * 
     */
    async deleteFileRaw(requestParameters: DeleteFileRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling deleteFile().'
            );
        }

        if (requestParameters['fileId'] == null) {
            throw new runtime.RequiredError(
                'fileId',
                'Required parameter "fileId" was null or undefined when calling deleteFile().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/buckets/{id}/files/{fileId}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))).replace(`{${"fileId"}}`, encodeURIComponent(String(requestParameters['fileId']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Deletes a file.
     * 
     */
    async deleteFile(id: number, fileId: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.deleteFileRaw({ id: id, fileId: fileId }, initOverrides);
    }

    /**
     * Deletes a file.
     * 
     */
    async deleteUserFileRaw(requestParameters: DeleteUserFileRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['fileId'] == null) {
            throw new runtime.RequiredError(
                'fileId',
                'Required parameter "fileId" was null or undefined when calling deleteUserFile().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/user-files/{fileId}`.replace(`{${"fileId"}}`, encodeURIComponent(String(requestParameters['fileId']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Deletes a file.
     * 
     */
    async deleteUserFile(fileId: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.deleteUserFileRaw({ fileId: fileId }, initOverrides);
    }

    /**
     * Gets the bucket with the given id.
     * 
     */
    async getBucketRaw(requestParameters: GetBucketRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<BucketDto>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling getBucket().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/buckets/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => BucketDtoFromJSON(jsonValue));
    }

    /**
     * Gets the bucket with the given id.
     * 
     */
    async getBucket(id: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<BucketDto> {
        const response = await this.getBucketRaw({ id: id }, initOverrides);
        return await response.value();
    }

    /**
     * Gets the buckets.
     * 
     */
    async getBucketsRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<BucketsDto>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/buckets`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => BucketsDtoFromJSON(jsonValue));
    }

    /**
     * Gets the buckets.
     * 
     */
    async getBuckets(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<BucketsDto> {
        const response = await this.getBucketsRaw(initOverrides);
        return await response.value();
    }

    /**
     * Gets the file types.
     * 
     */
    async getFileTypesRaw(requestParameters: GetFileTypesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<FileTypesDto>> {
        if (requestParameters['endpoint'] == null) {
            throw new runtime.RequiredError(
                'endpoint',
                'Required parameter "endpoint" was null or undefined when calling getFileTypes().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['endpoint'] != null) {
            queryParameters['endpoint'] = requestParameters['endpoint'];
        }

        if (requestParameters['headers'] != null) {
            queryParameters['headers'] = requestParameters['headers'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/buckets/fileTypes`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => FileTypesDtoFromJSON(jsonValue));
    }

    /**
     * Gets the file types.
     * 
     */
    async getFileTypes(endpoint: string, headers?: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<FileTypesDto> {
        const response = await this.getFileTypesRaw({ endpoint: endpoint, headers: headers }, initOverrides);
        return await response.value();
    }

    /**
     * Gets the files for the bucket.
     * 
     */
    async getFilesRaw(requestParameters: GetFilesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<FilesDto>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling getFiles().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['page'] != null) {
            queryParameters['page'] = requestParameters['page'];
        }

        if (requestParameters['pageSize'] != null) {
            queryParameters['pageSize'] = requestParameters['pageSize'];
        }

        if (requestParameters['query'] != null) {
            queryParameters['query'] = requestParameters['query'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/buckets/{id}/files`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => FilesDtoFromJSON(jsonValue));
    }

    /**
     * Gets the files for the bucket.
     * 
     */
    async getFiles(id: number, page?: number, pageSize?: number, query?: string, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<FilesDto> {
        const response = await this.getFilesRaw({ id: id, page: page, pageSize: pageSize, query: query }, initOverrides);
        return await response.value();
    }

    /**
     * Gets the files for the user bucket.
     * 
     */
    async getUserFilesRaw(requestParameters: GetUserFilesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<FilesDto>> {
        const queryParameters: any = {};

        if (requestParameters['page'] != null) {
            queryParameters['page'] = requestParameters['page'];
        }

        if (requestParameters['pageSize'] != null) {
            queryParameters['pageSize'] = requestParameters['pageSize'];
        }

        if (requestParameters['query'] != null) {
            queryParameters['query'] = requestParameters['query'];
        }

        if (requestParameters['conversationId'] != null) {
            queryParameters['conversationId'] = requestParameters['conversationId'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/user-files`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => FilesDtoFromJSON(jsonValue));
    }

    /**
     * Gets the files for the user bucket.
     * 
     */
    async getUserFiles(page?: number, pageSize?: number, query?: string, conversationId?: number, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<FilesDto> {
        const response = await this.getUserFilesRaw({ page: page, pageSize: pageSize, query: query, conversationId: conversationId }, initOverrides);
        return await response.value();
    }

    /**
     * 
     */
    async postBucketRaw(requestParameters: PostBucketRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<BucketDto>> {
        if (requestParameters['upsertBucketDto'] == null) {
            throw new runtime.RequiredError(
                'upsertBucketDto',
                'Required parameter "upsertBucketDto" was null or undefined when calling postBucket().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/buckets`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: UpsertBucketDtoToJSON(requestParameters['upsertBucketDto']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => BucketDtoFromJSON(jsonValue));
    }

    /**
     * 
     */
    async postBucket(upsertBucketDto: UpsertBucketDto, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<BucketDto> {
        const response = await this.postBucketRaw({ upsertBucketDto: upsertBucketDto }, initOverrides);
        return await response.value();
    }

    /**
     * Creates a file.
     * 
     */
    async postFileRaw(requestParameters: PostFileRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<FileDto>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling postFile().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const consumes: runtime.Consume[] = [
            { contentType: 'multipart/form-data' },
        ];
        // @ts-ignore: canConsumeForm may be unused
        const canConsumeForm = runtime.canConsumeForm(consumes);

        let formParams: { append(param: string, value: any): any };
        let useForm = false;
        // use FormData to transmit files using content-type "multipart/form-data"
        useForm = canConsumeForm;
        if (useForm) {
            formParams = new FormData();
        } else {
            formParams = new URLSearchParams();
        }

        if (requestParameters['file'] != null) {
            formParams.append('file', requestParameters['file'] as any);
        }

        const response = await this.request({
            path: `/api/buckets/{id}/files`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: formParams,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => FileDtoFromJSON(jsonValue));
    }

    /**
     * Creates a file.
     * 
     */
    async postFile(id: number, file?: Blob, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<FileDto> {
        const response = await this.postFileRaw({ id: id, file: file }, initOverrides);
        return await response.value();
    }

    /**
     * Creates an file.
     * 
     */
    async postUserFileRaw(requestParameters: PostUserFileRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<FileDto>> {
        if (requestParameters['extensionId'] == null) {
            throw new runtime.RequiredError(
                'extensionId',
                'Required parameter "extensionId" was null or undefined when calling postUserFile().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['extensionId'] != null) {
            queryParameters['extensionId'] = requestParameters['extensionId'];
        }

        if (requestParameters['conversationId'] != null) {
            queryParameters['conversationId'] = requestParameters['conversationId'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const consumes: runtime.Consume[] = [
            { contentType: 'multipart/form-data' },
        ];
        // @ts-ignore: canConsumeForm may be unused
        const canConsumeForm = runtime.canConsumeForm(consumes);

        let formParams: { append(param: string, value: any): any };
        let useForm = false;
        // use FormData to transmit files using content-type "multipart/form-data"
        useForm = canConsumeForm;
        if (useForm) {
            formParams = new FormData();
        } else {
            formParams = new URLSearchParams();
        }

        if (requestParameters['file'] != null) {
            formParams.append('file', requestParameters['file'] as any);
        }

        const response = await this.request({
            path: `/api/user-files`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: formParams,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => FileDtoFromJSON(jsonValue));
    }

    /**
     * Creates an file.
     * 
     */
    async postUserFile(extensionId: number, conversationId?: number, file?: Blob, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<FileDto> {
        const response = await this.postUserFileRaw({ extensionId: extensionId, conversationId: conversationId, file: file }, initOverrides);
        return await response.value();
    }

    /**
     * Updates a bucket.
     * 
     */
    async putBucketRaw(requestParameters: PutBucketRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<BucketDto>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling putBucket().'
            );
        }

        if (requestParameters['upsertBucketDto'] == null) {
            throw new runtime.RequiredError(
                'upsertBucketDto',
                'Required parameter "upsertBucketDto" was null or undefined when calling putBucket().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/buckets/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: UpsertBucketDtoToJSON(requestParameters['upsertBucketDto']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => BucketDtoFromJSON(jsonValue));
    }

    /**
     * Updates a bucket.
     * 
     */
    async putBucket(id: number, upsertBucketDto: UpsertBucketDto, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<BucketDto> {
        const response = await this.putBucketRaw({ id: id, upsertBucketDto: upsertBucketDto }, initOverrides);
        return await response.value();
    }

    /**
     * Updates a file.
     * 
     */
    async putFileRaw(requestParameters: PutFileRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<FileDto>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling putFile().'
            );
        }

        if (requestParameters['fileId'] == null) {
            throw new runtime.RequiredError(
                'fileId',
                'Required parameter "fileId" was null or undefined when calling putFile().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const consumes: runtime.Consume[] = [
            { contentType: 'multipart/form-data' },
        ];
        // @ts-ignore: canConsumeForm may be unused
        const canConsumeForm = runtime.canConsumeForm(consumes);

        let formParams: { append(param: string, value: any): any };
        let useForm = false;
        // use FormData to transmit files using content-type "multipart/form-data"
        useForm = canConsumeForm;
        if (useForm) {
            formParams = new FormData();
        } else {
            formParams = new URLSearchParams();
        }

        if (requestParameters['file'] != null) {
            formParams.append('file', requestParameters['file'] as any);
        }

        const response = await this.request({
            path: `/api/buckets/{id}/files/{fileId}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))).replace(`{${"fileId"}}`, encodeURIComponent(String(requestParameters['fileId']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: formParams,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => FileDtoFromJSON(jsonValue));
    }

    /**
     * Updates a file.
     * 
     */
    async putFile(id: number, fileId: number, file?: Blob, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<FileDto> {
        const response = await this.putFileRaw({ id: id, fileId: fileId, file: file }, initOverrides);
        return await response.value();
    }

    /**
     * Tests the bucket.
     * 
     */
    async testBucketRaw(requestParameters: TestBucketRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['testBucketDto'] == null) {
            throw new runtime.RequiredError(
                'testBucketDto',
                'Required parameter "testBucketDto" was null or undefined when calling testBucket().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/buckets/test`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: TestBucketDtoToJSON(requestParameters['testBucketDto']),
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Tests the bucket.
     * 
     */
    async testBucket(testBucketDto: TestBucketDto, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.testBucketRaw({ testBucketDto: testBucketDto }, initOverrides);
    }

}
