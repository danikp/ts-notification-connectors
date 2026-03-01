import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { OneSignalPushConnector } from './onesignal.connector';
import type { OneSignalConfig } from './onesignal.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: OneSignalConfig = {
  appId: 'app-uuid-123',
  apiKey: 'rest-api-key',
};

const defaultPushOptions = {
  target: ['sub-id-1'],
  title: 'Test Title',
  content: 'Test Content',
  payload: { key: 'value' },
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function buildSuccessResponse() {
  return {
    data: {
      id: 'onesignal-notif-123',
      external_id: null,
    },
  };
}

describe('OneSignalPushConnector', () => {
  let connector: OneSignalPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new OneSignalPushConnector(defaultConfig);
  });

  it('should have id "one-signal" and channelType PUSH', () => {
    expect(connector.id).toBe('one-signal');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a JSON message with Key auth and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultPushOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.onesignal.com/notifications');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Key rest-api-key',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.app_id).toBe('app-uuid-123');
    expect(parsedBody.contents).toEqual({ en: 'Test Content' });
    expect(parsedBody.headings).toEqual({ en: 'Test Title' });
    expect(parsedBody.include_subscription_ids).toEqual(['sub-id-1']);
    expect(parsedBody.data).toEqual({ key: 'value' });

    expect(result).toEqual({
      id: 'onesignal-notif-123',
      date: expect.any(String),
    });
  });

  it('should throw ConnectorError when response has empty id (soft failure)', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        id: '',
        errors: ['All included players are not subscribed'],
      },
    });

    try {
      await connector.sendMessage(defaultPushOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.message).toBe('All included players are not subscribed');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { errors: ['Invalid API key'] },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage(defaultPushOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerMessage).toBe('Invalid API key');
    }
  });

  it('should use overrides for title and body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      overrides: { title: 'Override Title', body: 'Override Body' },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.contents).toEqual({ en: 'Override Body' });
    expect(parsedBody.headings).toEqual({ en: 'Override Title' });
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage(defaultPushOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
