import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { GoogleChatChatConnector } from './google-chat.connector';
import type { GoogleChatConfig } from './google-chat.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: GoogleChatConfig = {
  webhookUrl: 'https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN',
};

function buildSuccessResponse() {
  return {
    data: {
      name: 'spaces/SPACE_ID/messages/MSG_ID',
      thread: { name: 'spaces/SPACE_ID/threads/THREAD_ID' },
    },
  };
}

describe('GoogleChatChatConnector', () => {
  let connector: GoogleChatChatConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new GoogleChatChatConnector(defaultConfig);
  });

  it('should have id "google-chat" and channelType CHAT', () => {
    expect(connector.id).toBe('google-chat');
    expect(connector.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should send a message to the config webhook URL', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      content: 'Hello from Google Chat!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN'
    );

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.text).toBe('Hello from Google Chat!');

    expect(result).toEqual({
      id: 'spaces/SPACE_ID/messages/MSG_ID',
      date: expect.any(String),
    });
  });

  it('should use options.webhookUrl over config.webhookUrl', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      content: 'Hello!',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/OTHER/messages?key=K2&token=T2',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe(
      'https://chat.googleapis.com/v1/spaces/OTHER/messages?key=K2&token=T2'
    );
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { content: 'Hello!' },
      {
        _passthrough: {
          body: {
            thread: { name: 'spaces/SPACE_ID/threads/THREAD_ID' },
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).thread).toBeDefined();
    expect((body as Record<string, unknown>).text).toBe('Hello!');
  });

  it('should throw ConnectorError when no webhook URL is provided', async () => {
    const noUrlConnector = new GoogleChatChatConnector({});

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
        data: {
          error: { message: 'The caller does not have permission' },
        },
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
      expect(connectorErr.providerMessage).toBe(
        'The caller does not have permission'
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
