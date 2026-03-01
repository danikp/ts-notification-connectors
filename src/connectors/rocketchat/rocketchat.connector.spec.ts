import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { RocketChatChatConnector } from './rocketchat.connector';
import type { RocketChatConfig } from './rocketchat.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: RocketChatConfig = {
  serverUrl: 'https://rocketchat.example.com',
  authToken: 'rc-auth-token-123',
  userId: 'rc-user-id-456',
  roomId: 'GENERAL',
};

function buildSuccessResponse() {
  return {
    data: {
      message: {
        _id: 'msg-abc-123',
        rid: 'GENERAL',
        msg: 'Hello!',
        ts: '2026-03-01T00:00:00.000Z',
      },
      success: true,
    },
  };
}

describe('RocketChatChatConnector', () => {
  let connector: RocketChatChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new RocketChatChatConnector(defaultConfig);
  });

  it('should have id "rocketchat" and channelType CHAT', () => {
    expect(connector.id).toBe('rocketchat');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a message with auth headers and config roomId', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      content: 'Hello from Rocket.Chat!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://rocketchat.example.com/api/v1/chat.sendMessage'
    );

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Auth-Token': 'rc-auth-token-123',
        'X-User-Id': 'rc-user-id-456',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    const message = parsedBody.message as Record<string, unknown>;
    expect(message.rid).toBe('GENERAL');
    expect(message.msg).toBe('Hello from Rocket.Chat!');

    expect(result).toEqual({
      id: 'msg-abc-123',
      date: expect.any(String),
    });
  });

  it('should use options.channel over config.roomId', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      channel: 'custom-room',
      content: 'Hello!',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    const message = parsedBody.message as Record<string, unknown>;
    expect(message.rid).toBe('custom-room');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { content: 'Hello!' },
      {
        _passthrough: {
          body: {
            emoji: ':rocket:',
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).emoji).toBe(':rocket:');
    expect(
      ((body as Record<string, unknown>).message as Record<string, unknown>).msg
    ).toBe('Hello!');
  });

  it('should throw ConnectorError when API returns success: false', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        message: { _id: '', rid: '', msg: '', ts: '' },
        success: false,
      },
    });

    try {
      await connector.sendMessage({ content: 'Hello!' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(500);
      expect(connectorErr.message).toContain('success: false');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { error: 'You must be logged in to do this.' },
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
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerMessage).toBe(
        'You must be logged in to do this.'
      );
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
