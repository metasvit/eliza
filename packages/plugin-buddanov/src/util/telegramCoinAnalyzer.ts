import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { composeContext } from "@elizaos/core";

interface TelegramConfig {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
  chatId: number;
  threadId: number;
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
      '1AgAOMTQ5LjE1NC4xNjcuNDEBuw/bdAZ3EGYa0buEOHUQI22B0VJ8SxL2rZrblTuJnikTLqcgmJckxHRtBKgmRdWcoyBksJHp7Gj9ubiaWjlPXC+3Nwqv0xy1XI7j2YkamwXlnGYZvazfC65phra3oqdPmI5aH8jYp0TYGnOuTWR4UW2toPlFAHzwSypFhTswhN+N4ofNTnRb1CnaRwQy7zlqOxr7FxcZcw7vgGD0nehUYI816ZisKocnfF9d75ePUicn8u1h0eQQD4C1JXgsM2BTgaP04hlXCM0DCDAT3gXDfxrseN6SozPeoSpe09PkmpLJNe8PZHpVxl4SAT/eVYPYWipSu9LewDU7n5DpB35UV4c='
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