import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MattermostChatConnector } from './mattermost.connector';
import type { MattermostConfig } from './mattermost.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: MattermostConfig = {
  webhookUrl: 'https://mattermost.example.com/hooks/abc123',
};

describe('MattermostChatConnector', () => {
  let connector: MattermostChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new MattermostChatConnector(defaultConfig);
  });

  it('should have id "mattermost" and channelType CHAT', () => {
    expect(connector.id).toBe('mattermost');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a message to the config webhook URL', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    const result = await connector.sendMessage({
      content: 'Hello from Mattermost!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://mattermost.example.com/hooks/abc123');

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.text).toBe('Hello from Mattermost!');

    expect(result).toEqual({
      id: undefined,
      date: expect.any(String),
    });
  });

  it('should include channel when options.channel is provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    await connector.sendMessage({
      content: 'Hello!',
      channel: 'town-square',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.channel).toBe('town-square');
    expect(parsedBody.text).toBe('Hello!');
  });

  it('should not include channel when options.channel is not provided', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    await connector.sendMessage({
      content: 'Hello!',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.channel).toBeUndefined();
  });

  it('should use options.webhookUrl over config.webhookUrl', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    await connector.sendMessage({
      content: 'Hello!',
      webhookUrl: 'https://mattermost.example.com/hooks/xyz789',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://mattermost.example.com/hooks/xyz789');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    await connector.sendMessage(
      { content: 'Hello!' },
      {
        _passthrough: {
          body: {
            icon_url: 'https://example.com/icon.png',
            username: 'bot',
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).icon_url).toBe(
      'https://example.com/icon.png'
    );
    expect((body as Record<string, unknown>).username).toBe('bot');
    expect((body as Record<string, unknown>).text).toBe('Hello!');
  });

  it('should throw ConnectorError when no webhook URL is provided', async () => {
    const noUrlConnector = new MattermostChatConnector({});

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
        status: 403,
        data: 'invalid_token',
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
      expect(connectorErr.statusCode).toBe(403);
      expect(connectorErr.providerMessage).toBe('invalid_token');
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
