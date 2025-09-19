import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

export class ResponseInputFile {
  @ApiProperty({ enum: ['input_file'] })
  type!: 'input_file';

  @ApiPropertyOptional({ type: 'string' })
  file_data?: string;

  @ApiPropertyOptional({ type: 'string' })
  file_id?: string;

  @ApiPropertyOptional({ type: 'string' })
  file_url?: string;

  @ApiPropertyOptional()
  filename?: string;
}

export class ResponseInputImage {
  @ApiProperty({ enum: ['low', 'high', 'auto'] })
  detail!: 'low' | 'high' | 'auto';

  @ApiProperty({ enum: ['input_image'] })
  type!: 'input_image';

  @ApiPropertyOptional({ type: 'string' })
  file_id?: string | null;

  @ApiPropertyOptional({ type: 'string' })
  image_url?: string | null;
}

export class ResponseInputText {
  @ApiProperty({ type: 'string' })
  text!: string;

  @ApiProperty({ enum: ['input_text'] })
  type!: 'input_text';
}

export type ResponseInputContent = ResponseInputText | ResponseInputImage | ResponseInputFile;

export type ResponseInputMessageContentList = Array<ResponseInputContent>;

export class EasyInputMessage {
  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          oneOf: [
            { $ref: getSchemaPath(ResponseInputText) },
            { $ref: getSchemaPath(ResponseInputImage) },
            { $ref: getSchemaPath(ResponseInputFile) },
          ],
        },
      },
    ],
  })
  content!: string | ResponseInputMessageContentList;

  @ApiProperty({ enum: ['user', 'assistant', 'system', 'developer'] })
  role!: 'user' | 'assistant' | 'system' | 'developer';

  @ApiPropertyOptional({ enum: ['message'] })
  type?: 'message';
}

export type ResponseInputItem = EasyInputMessage;

export type ResponseInput = Array<ResponseInputItem>;

export class ResponseCreateDto {
  @ApiProperty({ type: 'string' })
  model!: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { $ref: getSchemaPath(EasyInputMessage) } }] })
  input!: string | ResponseInput;

  @ApiPropertyOptional({ type: 'boolean' })
  stream?: boolean;

  @ApiPropertyOptional({ type: 'number' })
  temperature?: number;

  @ApiPropertyOptional({ type: 'string' })
  instructions?: string;

  @ApiPropertyOptional({ type: 'boolean' })
  store?: boolean;
}

export type ResponseDto = {
  id: string;
  object: 'response';
  created_at: number; // 1754392046;
  status: 'completed';
  background: false;
  error?: null;
  incomplete_details?: null;
  instructions?: string;
  max_output_tokens?: null;
  max_tool_calls?: null;
  model: string;
  output: [
    {
      id: string;
      type: 'message';
      status: 'completed';
      content: [
        {
          type: 'output_text';
          annotations: [];
          text: string;
        },
      ];
      role: 'assistant';
    },
  ];
  parallel_tool_calls: true;
  previous_response_id?: string;
  prompt_cache_key?: null;
  reasoning?: {
    effort?: null;
    summary?: null;
  };
  safety_identifier?: null;
  service_tier: 'default';
  store: boolean; // default true
  temperature: number;
  text: {
    format: {
      type: 'text';
    };
  };
  tool_choice: 'auto';
  tools: [];
  top_p: number; // 1.0
  truncation: 'disabled';
  usage: {
    input_tokens: number; // 11;
    input_tokens_details: {
      cached_tokens: 0;
    };
    output_tokens: number; // 19;
    output_tokens_details: {
      reasoning_tokens: 0;
    };
    total_tokens: number; // 30
  };
  user?: null;
  metadata: Record<string, any>;
};

export type FilePurpose = 'assistants' | 'batch' | 'fine-tune' | 'vision' | 'user_data' | 'evals';
