import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { CellactSmsConnector } from './cellact.connector';
import type { CellactConfig } from './cellact.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: CellactConfig = {
  username: 'cellact-user',
  password: 'cellact-pass',
  from: 'MySender',
};

function buildSuccessResponse() {
  return {
    data: '<PALO><HEAD><RESULTCODE>0</RESULTCODE></HEAD><BODY><BLMJ>msg-abc-123</BLMJ></BODY></PALO>',
  };
}

describe('CellactSmsConnector', () => {
  let connector: CellactSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new CellactSmsConnector(defaultConfig);
  });

  it('should have id "cellact" and channelType SMS', () => {
    expect(connector.id).toBe('cellact');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send XML via form param and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+972501234567',
      content: 'Hello from Cellact!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://cellactpro.net/GlobalSms/ExternalClient/GlobalAPI.asp');
    expect(config?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
    );

    const decoded = decodeURIComponent((body as string).replace('xmlString=', ''));
    expect(decoded).toContain('<FROM>MySender</FROM>');
    expect(decoded).toContain('USER="cellact-user"');
    expect(decoded).toContain('PASSWORD="cellact-pass"');
    expect(decoded).toContain('<CMD>sendtextmt</CMD>');
    expect(decoded).toContain('<CONTENT>Hello from Cellact!</CONTENT>');
    expect(decoded).toContain('<TO>+972501234567</TO>');

    expect(result).toEqual({
      id: 'msg-abc-123',
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
    const decoded = decodeURIComponent((body as string).replace('xmlString=', ''));
    expect(decoded).toContain('<FROM>OverrideSender</FROM>');
  });

  it('should escape XML special characters in message content', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '+972501234567',
      content: 'Price < 100 & tax > 0',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const decoded = decodeURIComponent((body as string).replace('xmlString=', ''));
    expect(decoded).toContain('<CONTENT>Price &lt; 100 &amp; tax &gt; 0</CONTENT>');
  });

  it('should escape XML special characters in credentials', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const connector2 = new CellactSmsConnector({
      username: 'user&"name',
      password: 'pass<word',
      from: 'Sender',
    });

    await connector2.sendMessage({
      to: '+972501234567',
      content: 'Hello',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const decoded = decodeURIComponent((body as string).replace('xmlString=', ''));
    expect(decoded).toContain('USER="user&amp;&quot;name"');
    expect(decoded).toContain('PASSWORD="pass&lt;word"');
  });

  it('should throw ConnectorError when RESULTCODE is non-zero', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: '<PALO><HEAD><RESULTCODE>-1</RESULTCODE><DESCRIPTION>Auth failed</DESCRIPTION></HEAD></PALO>',
    });

    try {
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.providerCode).toBe('-1');
      expect(connectorErr.providerMessage).toBe('Auth failed');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 500, data: '' },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).statusCode).toBe(500);
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
