import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { LineChatConnector } from './line.connector';
import type { LineConfig } from './line.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: LineConfig = {
  channelAccessToken: 'line-access-token-123',
};

function buildSuccessResponse() {
  return {
    data: {
      sentMessages: [
        { id: 'line-msg-456', quoteToken: 'qt-abc' },
      ],
    },
  };
}

describe('LineChatConnector', () => {
  let connector: LineChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new LineChatConnector(defaultConfig);
  });

  it('should have id "line" and channelType CHAT', () => {
    expect(connector.id).toBe('line');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a push message with Bearer auth', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      channel: 'U1234567890abcdef',
      content: 'Hello from LINE!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.line.me/v2/bot/message/push');

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer line-access-token-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.to).toBe('U1234567890abcdef');
    expect(parsedBody.messages).toEqual([
      { type: 'text', text: 'Hello from LINE!' },
    ]);

    expect(result).toEqual({
      id: 'line-msg-456',
      date: expect.any(String),
    });
  });

  it('should extract message ID from sentMessages response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        sentMessages: [{ id: 'custom-line-id' }],
      },
    });

    const result = await connector.sendMessage({
      channel: 'U1234567890abcdef',
      content: 'Test',
    });

    expect(result.id).toBe('custom-line-id');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { channel: 'U1234567890abcdef', content: 'Hello!' },
      {
        _passthrough: {
          body: {
            notificationDisabled: true,
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.notificationDisabled).toBe(true);
    expect(parsedBody.to).toBe('U1234567890abcdef');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 400,
        data: {
          message: 'The request body has 1 error(s)',
        },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        channel: 'U1234567890abcdef',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.providerMessage).toBe(
        'The request body has 1 error(s)'
      );
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        channel: 'U1234567890abcdef',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
