import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SlackChatConnector } from './slack.connector';
import type { SlackConfig } from './slack.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: SlackConfig = {
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
};

describe('SlackChatConnector', () => {
  let connector: SlackChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SlackChatConnector(defaultConfig);
  });

  it('should have id "slack" and channelType CHAT', () => {
    expect(connector.id).toBe('slack');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a message to the config webhook URL', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    const result = await connector.sendMessage({
      content: 'Hello from Slack!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://hooks.slack.com/services/T00/B00/xxx');

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.text).toBe('Hello from Slack!');

    expect(result).toEqual({
      id: undefined,
      date: expect.any(String),
    });
  });

  it('should use options.webhookUrl over config.webhookUrl', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    await connector.sendMessage({
      content: 'Hello!',
      webhookUrl: 'https://hooks.slack.com/services/T01/B01/yyy',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://hooks.slack.com/services/T01/B01/yyy');
  });

  it('should merge bridgeProviderData passthrough body (blocks)', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: 'ok' });

    await connector.sendMessage(
      { content: 'Hello!' },
      {
        _passthrough: {
          body: {
            blocks: [
              { type: 'section', text: { type: 'mrkdwn', text: '*Bold*' } },
            ],
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).blocks).toBeDefined();
    expect((body as Record<string, unknown>).text).toBe('Hello!');
  });

  it('should throw ConnectorError when no webhook URL is provided', async () => {
    const noUrlConnector = new SlackChatConnector({});

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
