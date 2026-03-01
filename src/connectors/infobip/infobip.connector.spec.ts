import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { InfobipSmsConnector } from './infobip.connector';
import type { InfobipConfig } from './infobip.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: InfobipConfig = {
  apiKey: 'infobip-api-key-123',
  baseUrl: 'abc123.api.infobip.com',
  from: 'InfoSMS',
};

function buildSuccessResponse() {
  return {
    data: {
      bulkId: 'bulk-123',
      messages: [
        {
          to: '+15559876543',
          status: {
            groupId: 1,
            groupName: 'PENDING',
            id: 26,
            name: 'PENDING_ACCEPTED',
            description: 'Message sent to next instance',
          },
          messageId: 'infobip-msg-123',
        },
      ],
    },
  };
}

describe('InfobipSmsConnector', () => {
  let connector: InfobipSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new InfobipSmsConnector(defaultConfig);
  });

  it('should have id "infobip" and channelType SMS', () => {
    expect(connector.id).toBe('infobip');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with App auth to the correct URL', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello from Infobip!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://abc123.api.infobip.com/sms/3/messages');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'App infobip-api-key-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    const messages = parsedBody.messages as Record<string, unknown>[];
    expect(messages[0]!.from).toBe('InfoSMS');
    expect(messages[0]!.destinations).toEqual([{ to: '+15559876543' }]);
    expect(messages[0]!.text).toBe('Hello from Infobip!');

    expect(result).toEqual({
      id: 'infobip-msg-123',
      date: expect.any(String),
    });
  });

  it('should use options.from over config.from', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello',
      from: '+15550000000',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const messages = (body as Record<string, unknown>).messages as Record<string, unknown>[];
    expect(messages[0]!.from).toBe('+15550000000');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '+15559876543', content: 'Hello!' },
      {
        _passthrough: {
          body: { sendAt: '2024-06-01T00:00:00Z' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).sendAt).toBe('2024-06-01T00:00:00Z');
    expect((body as Record<string, unknown>).messages).toBeDefined();
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: {
          requestError: {
            serviceException: {
              messageId: 'UNAUTHORIZED',
              text: 'Invalid API key',
            },
          },
        },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({ to: '+15559876543', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerMessage).toBe('Invalid API key');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({ to: '+15559876543', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
