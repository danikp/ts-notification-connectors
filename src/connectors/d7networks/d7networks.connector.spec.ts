import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { D7NetworksSmsConnector } from './d7networks.connector';
import type { D7NetworksConfig } from './d7networks.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: D7NetworksConfig = {
  apiToken: 'd7-bearer-token-123',
  from: 'D7SMS',
};

function buildSuccessResponse() {
  return {
    data: {
      request_id: 'd7-req-abc-123',
      status: 'accepted',
      created_at: '2024-01-01T00:00:00Z',
    },
  };
}

describe('D7NetworksSmsConnector', () => {
  let connector: D7NetworksSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new D7NetworksSmsConnector(defaultConfig);
  });

  it('should have id "d7networks" and channelType SMS', () => {
    expect(connector.id).toBe('d7networks');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with Bearer auth and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello from D7Networks!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.d7networks.com/messages/v1/send');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer d7-bearer-token-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    const messages = parsedBody.messages as Record<string, unknown>[];
    expect(messages[0]!.channel).toBe('sms');
    expect(messages[0]!.recipients).toEqual(['+15559876543']);
    expect(messages[0]!.content).toBe('Hello from D7Networks!');
    expect(messages[0]!.msg_type).toBe('text');

    const messageGlobals = parsedBody.message_globals as Record<string, unknown>;
    expect(messageGlobals.originator).toBe('D7SMS');

    expect(result).toEqual({
      id: 'd7-req-abc-123',
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
    const messageGlobals = (body as Record<string, unknown>).message_globals as Record<string, unknown>;
    expect(messageGlobals.originator).toBe('+15550000000');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '+15559876543', content: 'Hello!' },
      {
        _passthrough: {
          body: { report_url: 'https://example.com/callback' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).report_url).toBe('https://example.com/callback');
    expect((body as Record<string, unknown>).messages).toBeDefined();
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { code: 'UNAUTHORIZED', detail: 'Invalid token' },
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
      expect(connectorErr.providerMessage).toBe('Invalid token');
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
