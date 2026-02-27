import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { PlivoSmsConnector } from './plivo.connector';
import type { PlivoConfig } from './plivo.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: PlivoConfig = {
  authId: 'PLIVO_AUTH_ID',
  authToken: 'plivo-auth-token',
  from: '14155551234',
};

function buildSuccessResponse() {
  return {
    data: {
      api_id: 'api-id-123',
      message: 'message(s) queued',
      message_uuid: ['uuid-abc-123'],
    },
  };
}

describe('PlivoSmsConnector', () => {
  let connector: PlivoSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new PlivoSmsConnector(defaultConfig);
  });

  it('should have id "plivo" and channelType SMS', () => {
    expect(connector.id).toBe('plivo');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send JSON message with Basic auth to correct URL', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '14155550100',
      content: 'Hello from Plivo!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://api.plivo.com/v1/Account/PLIVO_AUTH_ID/Message/'
    );

    const expectedAuth = Buffer.from('PLIVO_AUTH_ID:plivo-auth-token').toString('base64');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: `Basic ${expectedAuth}`,
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.src).toBe('14155551234');
    expect(parsedBody.dst).toBe('14155550100');
    expect(parsedBody.text).toBe('Hello from Plivo!');

    expect(result).toEqual({
      id: 'uuid-abc-123',
      date: expect.any(String),
    });
  });

  it('should use "from" in options when it overrides the config default', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '14155550100',
      content: 'Hello!',
      from: '18005550199',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).src).toBe('18005550199');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '14155550100', content: 'Hello!' },
      {
        _passthrough: {
          body: { url: 'https://example.com/callback' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).url).toBe('https://example.com/callback');
    expect((body as Record<string, unknown>).dst).toBe('14155550100');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { api_id: 'err-id', error: 'Authentication Failed' },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        to: '14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerMessage).toBe('Authentication Failed');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        to: '14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
