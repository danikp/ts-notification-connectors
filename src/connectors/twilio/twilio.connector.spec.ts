import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TwilioSmsConnector } from './twilio.connector';
import type { TwilioConfig } from './twilio.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: TwilioConfig = {
  accountSid: 'ACtest123',
  authToken: 'auth-token-secret',
  from: '+15551234567',
};

function buildSuccessResponse() {
  return {
    data: {
      sid: 'SMtest456',
      status: 'queued',
      to: '+14155550100',
      from: '+15551234567',
      body: 'Hello!',
      date_created: 'Thu, 30 Jul 2025 20:12:31 +0000',
    },
  };
}

describe('TwilioSmsConnector', () => {
  let connector: TwilioSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new TwilioSmsConnector(defaultConfig);
  });

  it('should have id "twilio" and channelType SMS', () => {
    expect(connector.id).toBe('twilio');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send form-encoded message with Basic auth to correct URL', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+14155550100',
      content: 'Hello from Twilio!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json'
    );

    const expectedAuth = Buffer.from('ACtest123:auth-token-secret').toString('base64');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${expectedAuth}`,
      })
    );

    const params = new URLSearchParams(body as string);
    expect(params.get('To')).toBe('+14155550100');
    expect(params.get('From')).toBe('+15551234567');
    expect(params.get('Body')).toBe('Hello from Twilio!');

    expect(result).toEqual({
      id: 'SMtest456',
      date: expect.any(String),
    });
  });

  it('should use "from" in options when it overrides the config default', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '+14155550100',
      content: 'Hello!',
      from: '+18005550199',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('From')).toBe('+18005550199');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '+14155550100', content: 'Hello!' },
      {
        _passthrough: {
          body: { StatusCallback: 'https://example.com/callback' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('StatusCallback')).toBe('https://example.com/callback');
    expect(params.get('To')).toBe('+14155550100');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { code: 20003, message: 'Authentication Error' },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        to: '+14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerCode).toBe('20003');
      expect(connectorErr.providerMessage).toBe('Authentication Error');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        to: '+14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
      expect((err as ConnectorError).statusCode).toBe(500);
    }
  });
});
