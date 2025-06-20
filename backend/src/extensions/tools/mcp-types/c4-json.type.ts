import { Source } from 'src/domain/chat';

// Custom resource type for mcp responses
/* SCHEMA:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["kind", "version", "data"],
  "properties": {
    "kind": {
      "type": "string"
    },
    "version": {
      "type": "string"
    },
    "data": {
      "type": "object",
      "required": ["text", "id", "score", "region", "metadata"],
      "properties": {
        "text": {
          "type": "string"
        },
        "original": {
          "type": "string"
        },
        "id": {
          "type": "string"
        },
        "score": {
          "type": "number"
        },
        "region": {
          "type": "object",
          "properties": {
            "bounding_boxes": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["left", "top", "width", "height", "page"],
                "properties": {
                  "left": {
                    "type": "number"
                  },
                  "top": {
                    "type": "number"
                  },
                  "width": {
                    "type": "number"
                  },
                  "height": {
                    "type": "number"
                  },
                  "page": {
                    "type": "number"
                  }
                }
              }
            },
            "pages": {
              "type": "array",
              "items": {
                "type": "number"
              }
            }
          }
        },
        "metadata": {
          "type": "object",
          "required": ["uri", "mime_type"],
          "properties": {
            "uri": {
              "type": "string"
            },
            "mime_type": {
              "type": "string"
            },
            "link": {
              "type": "string"
            },
            "size": {
              "type": "number"
            },
            "title": {
              "type": "string"
            },
            "attributes": {
              "type": "object",
              "additionalProperties": true
            }
          }
        }
      }
    }
  }
}
*/

export type C4JsonType = {
  kind: string;
  version: string;
  data: {
    text: string;
    original?: string;
    id: string;
    score: number;
    region: {
      bounding_boxes?: {
        left: number;
        top: number;
        width: number;
        height: number;
        page: number;
      }[];
      pages?: number[];
    };
    metadata: {
      uri: string;
      mime_type: string;
      link?: string;
      size?: number;
      title?: string;
      attributes?: {
        [key: string]: any;
      };
    };
  };
};

const getDistinctPages = (regions: C4JsonType['data']['region']): number[] => {
  return Array.from(new Set(regions.bounding_boxes?.map((x) => x.page) ?? regions.pages ?? []));
};

export const convertC4JsonToText = (type: C4JsonType): { type: 'text'; text: string } => {
  return { type: 'text', text: type.data.original ?? type.data.text };
};

export const convertC4JsonToSource = (type: C4JsonType): Source => {
  const metadata = type.data.metadata;
  return {
    title: type.data.metadata.title ?? type.data.id,
    chunk: {
      content: type.data.original ?? type.data.text,
      pages: getDistinctPages(type.data.region),
      score: type.data.score,
    },
    document: {
      uri: type.data.metadata.uri,
      mimeType: type.data.metadata.mime_type,
      link: type.data.metadata.link,
      size: type.data.metadata.size,
    },
    metadata: metadata.attributes ?? {},
  };
};
