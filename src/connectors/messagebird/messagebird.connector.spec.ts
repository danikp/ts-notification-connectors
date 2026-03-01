import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MessageBirdSmsConnector } from './messagebird.connector';
import type { MessageBirdConfig } from './messagebird.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: MessageBirdConfig = {
  accessKey: 'live_abc123',
  from: 'MyApp',
};

function buildSuccessResponse() {
  return {
    data: {
      id: 'mbird-msg-123',
      href: 'https://rest.messagebird.com/messages/mbird-msg-123',
      direction: 'mt',
      type: 'sms',
      originator: 'MyApp',
      body: 'Hello',
      recipients: {
        totalCount: 1,
        totalSentCount: 1,
        items: [{ recipient: 15559876543, status: 'sent' }],
      },
    },
  };
}

describe('MessageBirdSmsConnector', () => {
  let connector: MessageBirdSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new MessageBirdSmsConnector(defaultConfig);
  });

  it('should have id "messagebird" and channelType SMS', () => {
    expect(connector.id).toBe('messagebird');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with AccessKey auth and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello from MessageBird!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://rest.messagebird.com/messages');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'AccessKey live_abc123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.originator).toBe('MyApp');
    expect(parsedBody.body).toBe('Hello from MessageBird!');
    expect(parsedBody.recipients).toEqual(['+15559876543']);

    expect(result).toEqual({
      id: 'mbird-msg-123',
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
    expect((body as Record<string, unknown>).originator).toBe('+15550000000');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '+15559876543', content: 'Hello!' },
      {
        _passthrough: {
          body: { reference: 'my-ref-123' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).reference).toBe('my-ref-123');
    expect((body as Record<string, unknown>).originator).toBe('MyApp');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 422,
        data: {
          errors: [{ code: 21, description: 'Bad request (phone number has unknown format)', parameter: 'recipients' }],
        },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({ to: 'invalid', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(422);
      expect(connectorErr.providerMessage).toBe('Bad request (phone number has unknown format)');
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
