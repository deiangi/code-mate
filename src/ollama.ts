import axios from 'axios';

export interface OllamaConfig {
  url: string;
  model: string;
  temperature: number;
  contextSize?: number;
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
  model_info?: {
    [key: string]: any;
  };
  modelfile: string;
  parameters: string;
  template: string;
  details_template?: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      required: string[];
      properties: Record<string, any>;
    };
  };
}

export interface ToolCall {
  type: 'function';
  function: {
    index?: number;
    name: string;
    arguments: Record<string, any>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
  thinking?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  done: boolean;
}

export class OllamaClient {
  private config: OllamaConfig;
  public onDebugLog?: (message: string) => void;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  getModel(): string {
    return this.config.model;
  }

  private logDebug(message: string) {
    if (this.onDebugLog) {
      this.onDebugLog(message);
    }
  }

  async chat(prompt: string, context?: string): Promise<string> {
    try {
      const systemPrompt =
        context ||
        'You are an intelligent code assistant. Help the user with code-related questions and tasks.';

      const response = await axios.post(
        `${this.config.url}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          system: systemPrompt,
          temperature: this.config.temperature,
          options: {
            num_ctx: this.config.contextSize || 4096,
          },
        },
        { timeout: 30000 }
      );

      return response.data.response || '';
    } catch (error) {
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async *chatStream(prompt: string, context?: string): AsyncGenerator<string, void, unknown> {
    try {
      const systemPrompt =
        context ||
        'You are an intelligent code assistant. Help the user with code-related questions and tasks.';

      const response = await axios.post(
        `${this.config.url}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: true,
          system: systemPrompt,
          temperature: this.config.temperature,
        },
        { timeout: 0, responseType: 'stream' }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              yield json.response;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    } catch (error) {
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async *chatStreamRaw(prompt: string, context?: string, contextArray?: number[], abortSignal?: AbortSignal): AsyncGenerator<any> {
    try {
      const systemPrompt =
        context ||
        'You are an intelligent code assistant. Help the user with code-related questions and tasks.';

      const requestPayload: any = {
        model: this.config.model,
        prompt: prompt,
        stream: true,
        system: systemPrompt,
        temperature: this.config.temperature,
        options: {
          num_ctx: this.config.contextSize || 4096,
        },
      };

      // Include context if provided
      if (contextArray && contextArray.length > 0) {
        requestPayload.context = contextArray;
      }

      this.logDebug(`REQUEST URL: POST ${this.config.url}/api/generate`);
      this.logDebug(`REQUEST PAYLOAD:\n${JSON.stringify(requestPayload, null, 2)}`);
      this.logDebug(`${'─'.repeat(80)}`);

      const response = await axios.post(
        `${this.config.url}/api/generate`,
        requestPayload,
        { timeout: 0, responseType: 'stream', signal: abortSignal }
      );

      this.logDebug(`RESPONSE STATUS: ${response.status}`);
      this.logDebug(`RESPONSE HEADERS: ${JSON.stringify(response.headers, null, 2)}`);
      this.logDebug(`${'─'.repeat(80)}`);
      this.logDebug('STREAMING JSON RESPONSES:');

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            this.logDebug(JSON.stringify(json, null, 2));
            yield json;
          } catch (e) {
            this.logDebug(`[PARSE ERROR] ${line}`);
          }
        }
      }
      
      this.logDebug(`${'─'.repeat(80)}`);
      this.logDebug('STREAM COMPLETE');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logDebug(`ERROR: ${errorMsg}`);
      if (axios.isAxiosError(error) && error.response) {
        this.logDebug(`ERROR STATUS: ${error.response.status}`);
        this.logDebug(`ERROR DATA: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async complete(code: string): Promise<string> {
    try {
      const prompt = `Complete this code:\n\n${code}`;

      const response = await axios.post(
        `${this.config.url}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          system:
            'You are a code completion assistant. Complete the code snippet provided. Only return the code completion, no explanations.',
          temperature: this.config.temperature,
        },
        { timeout: 30000 }
      );

      return response.data.response || '';
    } catch (error) {
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async explain(code: string): Promise<string> {
    try {
      const prompt = `Explain this code:\n\n${code}`;

      const response = await axios.post(
        `${this.config.url}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          system:
            'You are a code explanation assistant. Explain the given code in clear, concise language.',
          temperature: this.config.temperature,
          options: {
            num_ctx: this.config.contextSize || 4096,
          },
        },
        { timeout: 30000 }
      );

      return response.data.response || '';
    } catch (error) {
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async refactor(code: string): Promise<string> {
    try {
      const prompt = `Refactor this code to be more efficient and cleaner:\n\n${code}`;

      const response = await axios.post(
        `${this.config.url}/api/generate`,
        {
          model: this.config.model,
          prompt: prompt,
          stream: false,
          system:
            'You are a code refactoring assistant. Suggest improvements to the code for efficiency, readability, and maintainability. Return only the refactored code.',
          temperature: this.config.temperature,
          options: {
            num_ctx: this.config.contextSize || 4096,
          },
        },
        { timeout: 30000 }
      );

      return response.data.response || '';
    } catch (error) {
      throw new Error(`Ollama API error: ${error}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.url}/api/tags`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getModelInfo(modelName?: string): Promise<OllamaModelInfo | null> {
    try {
      const model = modelName || this.config.model;
      const response = await axios.post(
        `${this.config.url}/api/show`,
        { name: model },
        { timeout: 5000 }
      );
      this.logDebug(`Successfully retrieved model info for ${model}: ${JSON.stringify(response.data, null, 2)}`);
      return { ...response.data, name: model };
    } catch (error) {
      this.logDebug(`Failed to get model info for ${modelName || this.config.model}: ${error}`);
      return null;
    }
  }

  updateConfig(config: Partial<OllamaConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Tool definitions for workspace operations
  getAvailableTools(): Tool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'list_files',
          description: 'List the contents of a folder within the workspace. "/" is the root folder of the workspace.',
          parameters: {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                description: 'The path to the folder to list. Use "/" for the workspace root.'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the contents of a file within the workspace.',
          parameters: {
            type: 'object',
            required: ['path'],
            properties: {
              path: {
                type: 'string',
                description: 'The path to the file to read, relative to the workspace root.'
              }
            }
          }
        }
      }
    ];
  }

  // Chat with tool calling support
  async chatWithTools(messages: ChatMessage[], context?: string): Promise<ChatResponse> {
    try {
      const systemPrompt = context || 'You are an intelligent code assistant. Help the user with code-related questions and tasks. You have access to tools to explore the workspace.';

      const requestPayload = {
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: false,
        tools: this.getAvailableTools(),
        options: {
          temperature: this.config.temperature,
          num_ctx: this.config.contextSize || 4096,
        }
      };

      this.logDebug(`CHAT REQUEST: ${JSON.stringify(requestPayload, null, 2)}`);

      const response = await axios.post(
        `${this.config.url}/api/chat`,
        requestPayload,
        { timeout: 60000 }
      );

      this.logDebug(`CHAT RESPONSE: ${JSON.stringify(response.data, null, 2)}`);

      return {
        message: response.data.message,
        done: response.data.done
      };
    } catch (error) {
      throw new Error(`Ollama chat error: ${error}`);
    }
  }
}
