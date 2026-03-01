import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TextmagicSmsConnector } from './textmagic.connector';
import type { TextmagicConfig } from './textmagic.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: TextmagicConfig = {
  username: 'tm-user',
  apiKey: 'tm-api-key-123',
  from: 'MyCompany',
};

function buildSuccessResponse() {
  return {
    data: {
      id: 456,
      href: '/api/v2/messages/456',
      type: 'message',
      sessionId: 789,
      messageId: 12345,
    },
  };
}

describe('TextmagicSmsConnector', () => {
  let connector: TextmagicSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new TextmagicSmsConnector(defaultConfig);
  });

  it('should have id "textmagic" and channelType SMS', () => {
    expect(connector.id).toBe('textmagic');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with X-TM auth headers and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello from Textmagic!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://rest.textmagic.com/api/v2/messages');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'X-TM-Username': 'tm-user',
        'X-TM-Key': 'tm-api-key-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.text).toBe('Hello from Textmagic!');
    expect(parsedBody.phones).toBe('+15559876543');
    expect(parsedBody.from).toBe('MyCompany');

    expect(result).toEqual({
      id: '12345',
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
    expect((body as Record<string, unknown>).from).toBe('+15550000000');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '+15559876543', content: 'Hello!' },
      {
        _passthrough: {
          body: { sendingTime: 1609459200 },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).sendingTime).toBe(1609459200);
    expect((body as Record<string, unknown>).phones).toBe('+15559876543');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { code: 401, message: 'Authentication failed' },
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
      expect(connectorErr.providerMessage).toBe('Authentication failed');
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
