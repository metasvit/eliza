import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import type { IAgentRuntime } from "@elizaos/core";
import { composeContext } from "@elizaos/core";

interface TelegramConfig {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
  chatId: number;
  threadId: number;
}

function validateEnvVariables() {
  const required = [
    'TELEGRAM_API_ID',
    'TELEGRAM_API_HASH',
    'TELEGRAM_PHONE_NUMBER',
    'TELEGRAM_CHAT_ID',
    'TELEGRAM_THREAD_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export class TelegramHashAnalyzer {
  private client: TelegramClient;
  private readonly chatId: number;
  private readonly threadId: number;
  private isInitialized: boolean = false;

  constructor(private config: TelegramConfig) {
    this.chatId = config.chatId;
    this.threadId = config.threadId;

    const stringSession = new StringSession(
      '1AgAOMTQ5LjE1NC4xNjcuNDEBu6xZXuo6EhH0AsIbfXAvw76F84eg/fjY+BNw+lDPeElAr7EsvTZJ6OyI3MmCeaXL4a1dhRDbgQDMXFOhw4+56FpVpQrN6OACyhhtLJ3UTHS9HjgqbILsd2Tk77lMlSW109mixg9ADHhUW580HvGSSjymGXvPPQdq+kxCSrmvGEizNfGBZT6eoW7sMrG9P8GoPO3tqa8mllqPuWh//EAci+eWPz+xLP/QBtVgolkaB16YYDaBEvUOGKl9jVhIGQ5ZqYOeIz17q+CTgmNIBp1dkb3JIwa27Y4iDGReQ8uym9qaxe8KeEN2y+hbjOtffI23yMrN4y0RArsAHUYE9B4nPuQ='
    );

    this.client = new TelegramClient(
      stringSession,
      parseInt(config.apiId),
      config.apiHash,
      { connectionRetries: 5 }
    );
    console.log("log: constructor");
  }

  private isValidHash(text: string): boolean {
    const hashPattern = /[A-Za-z0-9]{32,}/;
    return hashPattern.test(text);
    console.log("log: isValidHash");
  }

  private formatMessage(messageText: string): string {
    const template = "@AgentScarlettBot analyze {{hash}}";
    const state = { hash: messageText } as any;
    const formatted = composeContext({ state, template });

    return formatted !== "@AgentScarlettBot analyze " ? formatted : messageText;
  }

  private async getScarlettResponse(messageId: number, timeout: number = 30000): Promise<string | null> {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const messages = await this.client.getMessages(this.chatId, {
        limit: 5,
        replyTo: this.threadId,
      });

      for (const message of messages) {
        if (
          this.isUser(message.sender) &&
          message.sender.username === 'AgentScarlettBot' &&
          message.replyTo?.replyToMsgId === messageId &&
          message.date * 1000 > startTime
        ) {
          return message.text;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return null;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ Telegram client is already initialized');
      return;
    }

    try {
      console.log('🔧 Attempting to initialize Telegram client...');
      console.log(`📱 Using phone number: ${this.config.phoneNumber}`);
      console.log(`🆔 API ID: ${this.config.apiId}`);
      /*console.log(`🔑 Session length: ${(this.client.session.save() as string).length} characters`);*/

      console.log('🔄 Connecting to Telegram servers...');
      await this.client.connect();
      console.log('✅ Successfully connected to servers');

      console.log('🔍 Checking authorization...');
      const isAuthorized = await this.client.isUserAuthorized();
      console.log(`📊 Authorization status: ${isAuthorized ? 'ACTIVE' : 'INACTIVE'}`);

      if (!isAuthorized) {
        console.log('⛔ Session is invalid or expired');
        throw new Error('Unauthorized access');
      }

      console.log('👤 Getting user information...');
      const me = await this.client.getMe();
      console.log(`🤖 Identified as: @${me.username} (${me.phone})`);

      this.isInitialized = true;
      console.log('🚀 Telegram client successfully initialized');
    } catch (error) {
      console.error('💥 Critical initialization error:');
      console.error('Error code:', error.code);
      console.error('Message:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async analyzeHash(messageText: string): Promise<{
    status: string;
    formattedMessage?: string;
    scarlettResponse?: string;
    error?: string;
  }> {
    try {
      console.log('🔍 Starting hash analysis...');
      if (!this.isInitialized) {
        console.log('⚠️ Client not initialized, starting initialization...');
        await this.initialize();
      }

      console.log('🔌 Checking connection status...');
      if (!this.client.connected) {
        console.log('🔄 Restoring connection...');
        await this.client.connect();
      }

      if (!this.isValidHash(messageText)) {
        return {
          status: 'error',
          error: 'Message does not contain a valid hash pattern',
        };
      }

      const formattedMessage = this.formatMessage(messageText);
      const sentMessage = await this.client.sendMessage(this.chatId, {
        message: formattedMessage,
        replyTo: this.threadId,
      });

      const response = await this.getScarlettResponse(sentMessage.id);

      if (response) {
        return {
          status: 'success',
          formattedMessage,
          scarlettResponse: response,
        };
      } else {
        return {
          status: 'pending',
          formattedMessage,
        };
      }
    } catch (error) {
      console.error('⛔ Error during analysis:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private isUser(sender: any): sender is { username: string } {
    return sender && typeof sender === 'object' && 'username' in sender;
  }

  private async sendTestMessage() {
    try {
      console.log('📨 Attempting to send test message...');
      await this.client.sendMessage('me', { message: 'Test message' });
      console.log('✅ Test message sent successfully');
    } catch (error) {
      console.error('❌ Error sending test message:', error);
    }
  }
}