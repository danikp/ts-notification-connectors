import type { IChatProvider, IChatOptions, ISendMessageSuccessResponse } from '../types';
import { ChannelTypeEnum, ChatProviderIdEnum } from '../types';
import { TelegramChatConnector } from '../connectors/telegram';
import type { TelegramConfig } from '../connectors/telegram';
import { SlackChatConnector } from '../connectors/slack';
import type { SlackConfig } from '../connectors/slack';
import { WhatsAppChatConnector } from '../connectors/whatsapp';
import type { WhatsAppConfig } from '../connectors/whatsapp';

export class Chat implements IChatProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.CHAT;
  private readonly connector: IChatProvider;

  constructor(connector: IChatProvider);
  constructor(providerId: ChatProviderIdEnum.Telegram, config: TelegramConfig);
  constructor(providerId: ChatProviderIdEnum.Slack, config: SlackConfig);
  constructor(providerId: ChatProviderIdEnum.WhatsAppBusiness, config: WhatsAppConfig);
  constructor(
    providerIdOrConnector: ChatProviderIdEnum | IChatProvider,
    config?: TelegramConfig | SlackConfig | WhatsAppConfig,
  ) {
    if (typeof providerIdOrConnector === 'object') {
      this.connector = providerIdOrConnector;
      this.id = providerIdOrConnector.id;
      return;
    }

    this.id = providerIdOrConnector;
    switch (providerIdOrConnector) {
      case ChatProviderIdEnum.Telegram:
        this.connector = new TelegramChatConnector(config as TelegramConfig);
        break;
      case ChatProviderIdEnum.Slack:
        this.connector = new SlackChatConnector(config as SlackConfig);
        break;
      case ChatProviderIdEnum.WhatsAppBusiness:
        this.connector = new WhatsAppChatConnector(config as WhatsAppConfig);
        break;
      default:
        throw new Error(`Unsupported chat provider: ${providerIdOrConnector as string}`);
    }
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData?: Record<string, unknown>,
  ): Promise<ISendMessageSuccessResponse> {
    return this.connector.sendMessage(options, bridgeProviderData);
  }
}
