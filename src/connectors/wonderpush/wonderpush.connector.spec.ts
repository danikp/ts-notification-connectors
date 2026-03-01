import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { WonderPushPushConnector } from './wonderpush.connector';
import type { WonderPushConfig } from './wonderpush.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: WonderPushConfig = {
  accessToken: 'test-access-token',
};

const defaultPushOptions = {
  target: ['target-1'],
  title: 'Test Title',
  content: 'Test Content',
  payload: {},
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function buildSuccessResponse() {
  return {
    data: {
      success: true,
      notificationId: 'wp-notif-123',
    },
  };
}

describe('WonderPushPushConnector', () => {
  let connector: WonderPushPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new WonderPushPushConnector(defaultConfig);
  });

  it('should have id "wonderpush" and channelType PUSH', () => {
    expect(connector.id).toBe('wonderpush');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a form-encoded message with accessToken in URL and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultPushOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://management-api.wonderpush.com/v1/deliveries?accessToken=test-access-token'
    );
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded',
      })
    );

    const params = new URLSearchParams(body as string);
    expect(params.get('targetUserIds')).toBe('target-1');

    const notification = JSON.parse(params.get('notification')!);
    expect(notification).toEqual({
      alert: { title: 'Test Title', text: 'Test Content' },
    });

    expect(result).toEqual({
      id: 'wp-notif-123',
      date: expect.any(String),
    });
  });

  it('should join multiple targets with commas', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      target: ['user-1', 'user-2', 'user-3'],
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('targetUserIds')).toBe('user-1,user-2,user-3');
  });

  it('should use overrides for title and body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      overrides: { title: 'Override Title', body: 'Override Body' },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    const notification = JSON.parse(params.get('notification')!);
    expect(notification).toEqual({
      alert: { title: 'Override Title', text: 'Override Body' },
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(defaultPushOptions, {
      _passthrough: {
        body: {
          campaignId: 'campaign-123',
        },
      },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('campaignId')).toBe('campaign-123');
    expect(params.get('targetUserIds')).toBe('target-1');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { error: { message: 'Invalid access token' } },
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
      expect(connectorErr.providerMessage).toBe('Invalid access token');
    }
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
