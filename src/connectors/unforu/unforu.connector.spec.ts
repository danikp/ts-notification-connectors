import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { UnforuSmsConnector } from './unforu.connector';
import type { UnforuConfig } from './unforu.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: UnforuConfig = {
  username: 'inforu-user',
  password: 'inforu-pass',
  from: 'MySender',
};

function buildSuccessResponse() {
  return {
    data: '<Result><Status>1</Status><Description>OK</Description></Result>',
  };
}

describe('UnforuSmsConnector', () => {
  let connector: UnforuSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new UnforuSmsConnector(defaultConfig);
  });

  it('should have id "unforu" and channelType SMS', () => {
    expect(connector.id).toBe('unforu');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send XML via form param and return { id: undefined, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+972501234567',
      content: 'Hello from Unforu!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.inforu.co.il/SendMessageXml.ashx');
    expect(config?.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
    );

    const decoded = decodeURIComponent((body as string).replace('InforuXML=', ''));
    expect(decoded).toContain('<Username>inforu-user</Username>');
    expect(decoded).toContain('<Password>inforu-pass</Password>');
    expect(decoded).toContain('<Message>Hello from Unforu!</Message>');
    expect(decoded).toContain('<PhoneNumber>+972501234567</PhoneNumber>');
    expect(decoded).toContain('<Sender>MySender</Sender>');

    expect(result).toEqual({
      id: undefined,
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
    const decoded = decodeURIComponent((body as string).replace('InforuXML=', ''));
    expect(decoded).toContain('<Sender>OverrideSender</Sender>');
  });

  it('should escape XML special characters in message content', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '+972501234567',
      content: 'Price < 100 & tax > 0',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const decoded = decodeURIComponent((body as string).replace('InforuXML=', ''));
    expect(decoded).toContain('<Message>Price &lt; 100 &amp; tax &gt; 0</Message>');
  });

  it('should throw ConnectorError when Status is not 1', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: '<Result><Status>-2</Status><Description>Invalid credentials</Description></Result>',
    });

    try {
      await connector.sendMessage({ to: '+972501234567', content: 'Hello' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.providerCode).toBe('-2');
      expect(connectorErr.providerMessage).toBe('Invalid credentials');
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
