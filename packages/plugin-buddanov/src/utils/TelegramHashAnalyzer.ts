import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';

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

    const stringSession = new StringSession(''); // Use empty string for first start
    this.client = new TelegramClient(
      stringSession,
      parseInt(config.apiId),
      config.apiHash,
      { connectionRetries: 5 }
    );
  }

  private isValidHash(text: string): boolean {
    const hashPattern = /[A-Za-z0-9]{32,}/;
    return hashPattern.test(text);
  }

  private formatMessage(messageText: string): string {
    const hashMatch = messageText.match(/[A-Za-z0-9]{32,}/);
    if (hashMatch) {
      const hashValue = hashMatch[0];
      return `@AgentScarlettBot analyze ${hashValue}`;
    }
    return messageText;
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
    if (this.isInitialized) return;

    await this.client.start({
      phoneNumber: this.config.phoneNumber,
      password: async () => await input.text('Please enter your password: '),
      phoneCode: async () => await input.text('Please enter the code you received: '),
      onError: (err) => console.log(err),
    });

    this.isInitialized = true;
    console.log('Telegram client initialized successfully');
  }

  async analyzeHash(messageText: string): Promise<{
    status: string;
    formattedMessage?: string;
    scarlettResponse?: string;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
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
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private isUser(sender: any): sender is { username: string } {
    return sender && typeof sender === 'object' && 'username' in sender;
  }
}