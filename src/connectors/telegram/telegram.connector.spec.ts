import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TelegramChatConnector } from './telegram.connector';
import type { TelegramConfig } from './telegram.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: TelegramConfig = {
  botToken: 'test-bot-token-123',
};

function buildSuccessResponse() {
  return {
    data: {
      ok: true,
      result: { message_id: 42 },
    },
  };
}

describe('TelegramChatConnector', () => {
  let connector: TelegramChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new TelegramChatConnector(defaultConfig);
  });

  it('should have id "telegram" and channelType CHAT', () => {
    expect(connector.id).toBe('telegram');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a message with chat_id from options.channel', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      channel: '123456789',
      content: 'Hello from Telegram!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://api.telegram.org/bottest-bot-token-123/sendMessage'
    );

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.chat_id).toBe('123456789');
    expect(parsedBody.text).toBe('Hello from Telegram!');
    expect(parsedBody.parse_mode).toBe('HTML');

    expect(result).toEqual({
      id: '42',
      date: expect.any(String),
    });
  });

  it('should default parse_mode to HTML', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      channel: '123456789',
      content: '<b>Bold text</b>',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).parse_mode).toBe('HTML');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { channel: '123456789', content: 'Hello!' },
      {
        _passthrough: {
          body: { disable_notification: true },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).disable_notification).toBe(true);
    expect((body as Record<string, unknown>).chat_id).toBe('123456789');
  });

  it('should throw ConnectorError when API returns ok: false', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      },
    });

    try {
      await connector.sendMessage({
        channel: '123456789',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(403);
      expect(connectorErr.providerMessage).toBe(
        'Forbidden: bot was blocked by the user'
      );
    }
  });

  it('should throw ConnectorError on axios error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { ok: false, error_code: 401, description: 'Unauthorized' },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        channel: '123456789',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerMessage).toBe('Unauthorized');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        channel: '123456789',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
