import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chat } from './chat.facade';
import { ChannelTypeEnum, ChatProviderIdEnum } from '../types';
import type { IChatProvider, IChatOptions } from '../types';
import { TelegramChatConnector } from '../connectors/telegram';
import { SlackChatConnector } from '../connectors/slack';
import { WhatsAppChatConnector } from '../connectors/whatsapp';
import { DiscordChatConnector } from '../connectors/discord';
import { MsTeamsChatConnector } from '../connectors/msteams';
import { GoogleChatChatConnector } from '../connectors/google-chat';
import { MattermostChatConnector } from '../connectors/mattermost';
import { RocketChatChatConnector } from '../connectors/rocketchat';
import { LineChatConnector } from '../connectors/line';

vi.mock('../connectors/telegram');
vi.mock('../connectors/slack');
vi.mock('../connectors/whatsapp');
vi.mock('../connectors/discord');
vi.mock('../connectors/msteams');
vi.mock('../connectors/google-chat');
vi.mock('../connectors/mattermost');
vi.mock('../connectors/rocketchat');
vi.mock('../connectors/line');

const MockedTelegram = vi.mocked(TelegramChatConnector);
const MockedSlack = vi.mocked(SlackChatConnector);
const MockedWhatsApp = vi.mocked(WhatsAppChatConnector);
const MockedDiscord = vi.mocked(DiscordChatConnector);
const MockedMsTeams = vi.mocked(MsTeamsChatConnector);
const MockedGoogleChat = vi.mocked(GoogleChatChatConnector);
const MockedMattermost = vi.mocked(MattermostChatConnector);
const MockedRocketChat = vi.mocked(RocketChatChatConnector);
const MockedLine = vi.mocked(LineChatConnector);

const chatOptions: IChatOptions = {
  content: 'Hello',
};

describe('Chat facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate TelegramChatConnector for Telegram provider ID', () => {
    const config = { botToken: 'bot-token' };
    const facade = new Chat(ChatProviderIdEnum.Telegram, config);

    expect(facade.id).toBe('telegram');
    expect(facade.channelType).toBe(ChannelTypeEnum.CHAT);
    expect(MockedTelegram).toHaveBeenCalledWith(config);
  });

  it('should instantiate SlackChatConnector for Slack provider ID', () => {
    const config = { webhookUrl: 'https://hooks.slack.com/test' };
    const facade = new Chat(ChatProviderIdEnum.Slack, config);

    expect(facade.id).toBe('slack');
    expect(MockedSlack).toHaveBeenCalledWith(config);
  });

  it('should instantiate WhatsAppChatConnector for WhatsAppBusiness provider ID', () => {
    const config = { accessToken: 'token', phoneNumberId: '123' };
    const facade = new Chat(ChatProviderIdEnum.WhatsAppBusiness, config);

    expect(facade.id).toBe('whatsapp-business');
    expect(MockedWhatsApp).toHaveBeenCalledWith(config);
  });

  it('should instantiate DiscordChatConnector for Discord provider ID', () => {
    const config = { webhookUrl: 'https://discord.com/api/webhooks/123/abc' };
    const facade = new Chat(ChatProviderIdEnum.Discord, config);

    expect(facade.id).toBe('discord');
    expect(MockedDiscord).toHaveBeenCalledWith(config);
  });

  it('should instantiate MsTeamsChatConnector for MsTeams provider ID', () => {
    const config = { webhookUrl: 'https://region.logic.azure.com/workflows/abc' };
    const facade = new Chat(ChatProviderIdEnum.MsTeams, config);

    expect(facade.id).toBe('msteams');
    expect(MockedMsTeams).toHaveBeenCalledWith(config);
  });

  it('should instantiate GoogleChatChatConnector for GoogleChat provider ID', () => {
    const config = { webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages?key=yyy' };
    const facade = new Chat(ChatProviderIdEnum.GoogleChat, config);

    expect(facade.id).toBe('google-chat');
    expect(MockedGoogleChat).toHaveBeenCalledWith(config);
  });

  it('should instantiate MattermostChatConnector for Mattermost provider ID', () => {
    const config = { webhookUrl: 'https://mattermost.example.com/hooks/xxx' };
    const facade = new Chat(ChatProviderIdEnum.Mattermost, config);

    expect(facade.id).toBe('mattermost');
    expect(MockedMattermost).toHaveBeenCalledWith(config);
  });

  it('should instantiate RocketChatChatConnector for RocketChat provider ID', () => {
    const config = { serverUrl: 'https://rocket.example.com', authToken: 'token', userId: 'uid', roomId: 'rid' };
    const facade = new Chat(ChatProviderIdEnum.RocketChat, config);

    expect(facade.id).toBe('rocketchat');
    expect(MockedRocketChat).toHaveBeenCalledWith(config);
  });

  it('should instantiate LineChatConnector for LINE provider ID', () => {
    const config = { channelAccessToken: 'line-token' };
    const facade = new Chat(ChatProviderIdEnum.LINE, config);

    expect(facade.id).toBe('line');
    expect(MockedLine).toHaveBeenCalledWith(config);
  });

  it('should accept a custom IChatProvider connector', () => {
    const custom: IChatProvider = {
      id: 'custom-chat',
      channelType: ChannelTypeEnum.CHAT,
      sendMessage: vi.fn().mockResolvedValue({ id: 'custom-123' }),
    };
    const facade = new Chat(custom);

    expect(facade.id).toBe('custom-chat');
    expect(facade.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should throw for unsupported provider ID', () => {
    expect(() => new Chat('unknown' as ChatProviderIdEnum, {} as any)).toThrow(
      'Unsupported chat provider: unknown',
    );
  });

  it('should delegate sendMessage to the connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'telegram-123' });
    MockedTelegram.prototype.sendMessage = sendMock;

    const facade = new Chat(ChatProviderIdEnum.Telegram, { botToken: 'bot-token' });
    const result = await facade.sendMessage(chatOptions);

    expect(sendMock).toHaveBeenCalledWith(chatOptions, undefined);
    expect(result).toEqual({ id: 'telegram-123' });
  });

  it('should delegate sendMessage with bridgeProviderData', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'slack-456' });
    MockedSlack.prototype.sendMessage = sendMock;

    const facade = new Chat(ChatProviderIdEnum.Slack, { webhookUrl: 'https://hooks.slack.com/test' });
    const bridge = { extra: 'data' };
    const result = await facade.sendMessage(chatOptions, bridge);

    expect(sendMock).toHaveBeenCalledWith(chatOptions, bridge);
    expect(result).toEqual({ id: 'slack-456' });
  });

  it('should delegate sendMessage on a custom connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'custom-789' });
    const custom: IChatProvider = {
      id: 'custom-chat',
      channelType: ChannelTypeEnum.CHAT,
      sendMessage: sendMock,
    };
    const facade = new Chat(custom);
    const result = await facade.sendMessage(chatOptions);

    expect(sendMock).toHaveBeenCalledWith(chatOptions, undefined);
    expect(result).toEqual({ id: 'custom-789' });
  });
});
