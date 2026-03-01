import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SinchSmsConnector } from './sinch.connector';
import type { SinchConfig } from './sinch.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: SinchConfig = {
  servicePlanId: 'plan-123',
  apiToken: 'sinch-token',
  from: '+15551234567',
};

function buildSuccessResponse() {
  return {
    data: {
      id: 'sinch-batch-123',
      to: ['+15559876543'],
      from: '+15551234567',
      body: 'Hello',
      type: 'mt_text',
      created_at: '2024-01-01T00:00:00Z',
      modified_at: '2024-01-01T00:00:00Z',
    },
  };
}

describe('SinchSmsConnector', () => {
  let connector: SinchSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SinchSmsConnector(defaultConfig);
  });

  it('should have id "sinch" and channelType SMS', () => {
    expect(connector.id).toBe('sinch');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a JSON message with Bearer auth to the correct regional URL', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '+15559876543',
      content: 'Hello from Sinch!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://us.sms.api.sinch.com/xms/v1/plan-123/batches');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer sinch-token',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.from).toBe('+15551234567');
    expect(parsedBody.to).toEqual(['+15559876543']);
    expect(parsedBody.body).toBe('Hello from Sinch!');

    expect(result).toEqual({
      id: 'sinch-batch-123',
      date: expect.any(String),
    });
  });

  it('should use configured region in URL', async () => {
    const euConnector = new SinchSmsConnector({ ...defaultConfig, region: 'eu' });
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await euConnector.sendMessage({ to: '+15559876543', content: 'Hello' });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://eu.sms.api.sinch.com/xms/v1/plan-123/batches');
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
        status: 401,
        data: { code: 'unauthorized', text: 'Invalid credentials' },
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
      expect(connectorErr.providerMessage).toBe('Invalid credentials');
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
