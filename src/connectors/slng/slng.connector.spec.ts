import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SlngSmsConnector } from './slng.connector';
import type { SlngConfig } from './slng.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: SlngConfig = {
  username: 'slng-user',
  password: 'slng-pass',
  from: '0501234567',
};

function buildSuccessResponse() {
  return {
    data: {
      Status: true,
      Description: 'OK',
      GeneralGUID: 'guid-abc-123',
    },
  };
}

describe('SlngSmsConnector', () => {
  let connector: SlngSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SlngSmsConnector(defaultConfig);
  });

  it('should have id "slng" and channelType SMS', () => {
    expect(connector.id).toBe('slng');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send URL-encoded JSON body and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+972501234567',
      content: 'Hello from SLNG!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://slng5.com/Api/SendSmsJsonBody.ashx');
    expect(config?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
    );

    const decoded = JSON.parse(decodeURIComponent(body as string));
    expect(decoded.Username).toBe('slng-user');
    expect(decoded.Password).toBe('slng-pass');
    expect(decoded.MsgName).toBe('SMS');
    expect(decoded.MsgBody).toBe('Hello from SLNG!');
    expect(decoded.FromMobile).toBe('0501234567');
    expect(decoded.Mobiles).toEqual([{ Mobile: '+972501234567' }]);

    expect(result).toEqual({
      id: 'guid-abc-123',
      date: expect.any(String),
    });
  });

  it('should use options.from over config.from', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '+972501234567',
      content: 'Hello',
      from: '0509999999',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const decoded = JSON.parse(decodeURIComponent(body as string));
    expect(decoded.FromMobile).toBe('0509999999');
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
    const decoded = JSON.parse(decodeURIComponent(body as string));
    expect(decoded.CustomField).toBe('custom-value');
    expect(decoded.Username).toBe('slng-user');
  });

  it('should throw ConnectorError when Status is false', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        Status: false,
        Description: 'Invalid credentials',
        GeneralGUID: '',
      },
    });

    try {
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.providerMessage).toBe('Invalid credentials');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 500,
        data: { Description: 'Server error' },
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
      expect(connectorErr.statusCode).toBe(500);
      expect(connectorErr.providerMessage).toBe('Server error');
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
