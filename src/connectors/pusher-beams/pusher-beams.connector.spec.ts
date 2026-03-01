import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { PusherBeamsPushConnector } from './pusher-beams.connector';
import type { PusherBeamsConfig } from './pusher-beams.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: PusherBeamsConfig = {
  instanceId: 'test-instance-id',
  secretKey: 'test-secret-key',
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
      publishId: 'publish-123',
    },
  };
}

describe('PusherBeamsPushConnector', () => {
  let connector: PusherBeamsPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new PusherBeamsPushConnector(defaultConfig);
  });

  it('should have id "pusher-beams" and channelType PUSH', () => {
    expect(connector.id).toBe('pusher-beams');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a JSON message with Bearer auth and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultPushOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe(
      'https://test-instance-id.pushnotifications.pusher.com/publish_api/v1/instances/test-instance-id/publishes/users'
    );
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-secret-key',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.users).toEqual(['target-1']);
    expect(parsedBody.fcm).toEqual({
      notification: { title: 'Test Title', body: 'Test Content' },
    });
    expect(parsedBody.apns).toEqual({
      aps: { alert: { title: 'Test Title', body: 'Test Content' } },
    });
    expect(parsedBody.web).toEqual({
      notification: { title: 'Test Title', body: 'Test Content' },
    });

    expect(result).toEqual({
      id: 'publish-123',
      date: expect.any(String),
    });
  });

  it('should use overrides for title and body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      overrides: { title: 'Override Title', body: 'Override Body' },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.fcm).toEqual({
      notification: { title: 'Override Title', body: 'Override Body' },
    });
    expect(parsedBody.apns).toEqual({
      aps: { alert: { title: 'Override Title', body: 'Override Body' } },
    });
    expect(parsedBody.web).toEqual({
      notification: { title: 'Override Title', body: 'Override Body' },
    });
  });

  it('should include fcm.data when payload has data', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      payload: { key: 'value' },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect((parsedBody.fcm as Record<string, unknown>).data).toEqual({
      key: 'value',
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(defaultPushOptions, {
      _passthrough: {
        body: {
          web: { notification: { title: 'Passthrough Title', body: 'Passthrough Body', icon: 'https://example.com/icon.png' } },
        },
      },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.web).toBeDefined();
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { error: 'Unauthorized' },
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
      expect(connectorErr.providerMessage).toBe('Unauthorized');
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
