import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { UnicellSmsConnector } from './unicell.connector';
import type { UnicellConfig } from './unicell.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: UnicellConfig = {
  username: 'unicell-user',
  password: 'unicell-pass',
  from: 'MySender',
};

function buildSuccessResponse() {
  return {
    data: {
      StatusCode: 0,
      StatusDescription: 'OK',
      References: [{ ReferenceNumber: 'ref-abc-123' }],
    },
  };
}

describe('UnicellSmsConnector', () => {
  let connector: UnicellSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new UnicellSmsConnector(defaultConfig);
  });

  it('should have id "unicell" and channelType SMS', () => {
    expect(connector.id).toBe('unicell');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with credentials in body and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+972501234567',
      content: 'Hello from Unicell!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://restapi.soprano.co.il/api/Sms');
    expect(config?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/json' })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.UserName).toBe('unicell-user');
    expect(parsedBody.Password).toBe('unicell-pass');
    expect(parsedBody.SenderName).toBe('MySender');
    expect(parsedBody.BodyMessage).toBe('Hello from Unicell!');
    expect(parsedBody.Recipients).toEqual([{ Cellphone: '+972501234567' }]);

    expect(result).toEqual({
      id: 'ref-abc-123',
      date: expect.any(String),
    });
  });

  it('should use options.from over config.from', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '+972501234567',
      content: 'Hello',
      from: 'OverrideSender',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).SenderName).toBe('OverrideSender');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: '+972501234567', content: 'Hello!' },
      {
        _passthrough: {
          body: { CustomField: 'custom-value' },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).CustomField).toBe('custom-value');
    expect((body as Record<string, unknown>).UserName).toBe('unicell-user');
  });

  it('should throw ConnectorError when StatusCode is non-zero', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        StatusCode: 1,
        StatusDescription: 'Invalid credentials',
        References: [],
      },
    });

    try {
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.providerCode).toBe('1');
      expect(connectorErr.providerMessage).toBe('Invalid credentials');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { StatusCode: 401, StatusDescription: 'Unauthorized' },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
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
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
