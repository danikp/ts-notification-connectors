import type { IChatProvider, IChatOptions, ISendMessageSuccessResponse } from '../types';
import { ChannelTypeEnum, ChatProviderIdEnum } from '../types';
import { TelegramChatConnector } from '../connectors/telegram';
import type { TelegramConfig } from '../connectors/telegram';
import { SlackChatConnector } from '../connectors/slack';
import type { SlackConfig } from '../connectors/slack';
import { WhatsAppChatConnector } from '../connectors/whatsapp';
import type { WhatsAppConfig } from '../connectors/whatsapp';
import { DiscordChatConnector } from '../connectors/discord';
import type { DiscordConfig } from '../connectors/discord';
import { MsTeamsChatConnector } from '../connectors/msteams';
import type { MsTeamsConfig } from '../connectors/msteams';
import { GoogleChatChatConnector } from '../connectors/google-chat';
import type { GoogleChatConfig } from '../connectors/google-chat';
import { MattermostChatConnector } from '../connectors/mattermost';
import type { MattermostConfig } from '../connectors/mattermost';
import { RocketChatChatConnector } from '../connectors/rocketchat';
import type { RocketChatConfig } from '../connectors/rocketchat';
import { LineChatConnector } from '../connectors/line';
import type { LineConfig } from '../connectors/line';

export class Chat implements IChatProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.CHAT;
  private readonly connector: IChatProvider;

  constructor(connector: IChatProvider);
  constructor(providerId: ChatProviderIdEnum.Telegram, config: TelegramConfig);
  constructor(providerId: ChatProviderIdEnum.Slack, config: SlackConfig);
  constructor(providerId: ChatProviderIdEnum.WhatsAppBusiness, config: WhatsAppConfig);
  constructor(providerId: ChatProviderIdEnum.Discord, config: DiscordConfig);
  constructor(providerId: ChatProviderIdEnum.MsTeams, config: MsTeamsConfig);
  constructor(providerId: ChatProviderIdEnum.GoogleChat, config: GoogleChatConfig);
  constructor(providerId: ChatProviderIdEnum.Mattermost, config: MattermostConfig);
  constructor(providerId: ChatProviderIdEnum.RocketChat, config: RocketChatConfig);
  constructor(providerId: ChatProviderIdEnum.LINE, config: LineConfig);
  constructor(
    providerIdOrConnector: ChatProviderIdEnum | IChatProvider,
    config?:
      | TelegramConfig
      | SlackConfig
      | WhatsAppConfig
      | DiscordConfig
      | MsTeamsConfig
      | GoogleChatConfig
      | MattermostConfig
      | RocketChatConfig
      | LineConfig,
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
      case ChatProviderIdEnum.Discord:
        this.connector = new DiscordChatConnector(config as DiscordConfig);
        break;
      case ChatProviderIdEnum.MsTeams:
        this.connector = new MsTeamsChatConnector(config as MsTeamsConfig);
        break;
      case ChatProviderIdEnum.GoogleChat:
        this.connector = new GoogleChatChatConnector(config as GoogleChatConfig);
        break;
      case ChatProviderIdEnum.Mattermost:
        this.connector = new MattermostChatConnector(config as MattermostConfig);
        break;
      case ChatProviderIdEnum.RocketChat:
        this.connector = new RocketChatChatConnector(config as RocketChatConfig);
        break;
      case ChatProviderIdEnum.LINE:
        this.connector = new LineChatConnector(config as LineConfig);
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
