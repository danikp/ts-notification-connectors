import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TelnyxSmsConnector } from './telnyx.connector';
import type { TelnyxConfig } from './telnyx.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: TelnyxConfig = {
  apiKey: 'KEY_test_123',
  from: '+15551234567',
};

function buildSuccessResponse() {
  return {
    data: {
      data: {
        id: 'telnyx-msg-123',
        record_type: 'message',
        direction: 'outbound',
        type: 'SMS',
        from: { phone_number: '+15551234567' },
        to: [{ phone_number: '+15559876543', status: 'queued' }],
        text: 'Hello',
      },
    },
  };
}

describe('TelnyxSmsConnector', () => {
  let connector: TelnyxSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new TelnyxSmsConnector(defaultConfig);
  });

  it('should have id "telnyx" and channelType SMS', () => {
    expect(connector.id).toBe('telnyx');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with Bearer auth and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello from Telnyx!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.telnyx.com/v2/messages');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer KEY_test_123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.from).toBe('+15551234567');
    expect(parsedBody.to).toBe('+15559876543');
    expect(parsedBody.text).toBe('Hello from Telnyx!');

    expect(result).toEqual({
      id: 'telnyx-msg-123',
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

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 422,
        data: { errors: [{ code: '40002', detail: 'Invalid phone number', title: 'Invalid' }] },
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
      expect(connectorErr.providerCode).toBe('40002');
      expect(connectorErr.providerMessage).toBe('Invalid phone number');
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
