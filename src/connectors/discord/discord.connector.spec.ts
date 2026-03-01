import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { DiscordChatConnector } from './discord.connector';
import type { DiscordConfig } from './discord.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: DiscordConfig = {
  webhookUrl: 'https://discord.com/api/webhooks/123/abc',
};

function buildSuccessResponse() {
  return {
    data: {
      id: 'discord-msg-123',
      type: 0,
      content: 'Hello!',
      channel_id: '456',
    },
  };
}

describe('DiscordChatConnector', () => {
  let connector: DiscordChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new DiscordChatConnector(defaultConfig);
  });

  it('should have id "discord" and channelType CHAT', () => {
    expect(connector.id).toBe('discord');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a message to the config webhook URL with ?wait=true', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      content: 'Hello from Discord!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://discord.com/api/webhooks/123/abc?wait=true');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.content).toBe('Hello from Discord!');

    expect(result).toEqual({
      id: 'discord-msg-123',
      date: expect.any(String),
    });
  });

  it('should use options.webhookUrl over config.webhookUrl', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      content: 'Hello!',
      webhookUrl: 'https://discord.com/api/webhooks/789/xyz',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://discord.com/api/webhooks/789/xyz?wait=true');
  });

  it('should merge bridgeProviderData passthrough body (embeds)', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { content: 'Hello!' },
      {
        _passthrough: {
          body: {
            embeds: [{ title: 'Embed', description: 'Test' }],
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).embeds).toBeDefined();
    expect((body as Record<string, unknown>).content).toBe('Hello!');
  });

  it('should throw ConnectorError when no webhook URL is provided', async () => {
    const noUrlConnector = new DiscordChatConnector({});

    try {
      await noUrlConnector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.message).toContain('Missing webhook URL');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 404,
        data: { message: 'Unknown Webhook', code: 10015 },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(404);
      expect(connectorErr.providerMessage).toBe('Unknown Webhook');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
