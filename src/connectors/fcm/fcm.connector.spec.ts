import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as fcmAuth from './fcm.auth';
import { FcmPushConnector } from './fcm.connector';
import type { FcmConfig } from './fcm.config';
import type { IPushOptions } from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
vi.mock('./fcm.auth');

const mockedAxios = vi.mocked(axios, true);
const mockedAuth = vi.mocked(fcmAuth, true);

const defaultConfig: FcmConfig = {
  projectId: 'test-project',
  email: 'test@test-project.iam.gserviceaccount.com',
  secretKey: 'fake-private-key',
};

const FCM_SEND_URL =
  'https://fcm.googleapis.com/v1/projects/test-project/messages:send';

const defaultOptions: IPushOptions = {
  target: ['device-token-1'],
  title: 'Test Title',
  content: 'Test Body',
  payload: { key1: 'value1', key2: 42 },
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function buildFcmSuccessResponse(name = 'projects/test-project/messages/0:abc123') {
  return { data: { name } };
}

describe('FcmPushConnector', () => {
  let connector: FcmPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new FcmPushConnector(defaultConfig);

    mockedAuth.getAccessToken.mockResolvedValue({
      token: 'mock-access-token',
      cache: { accessToken: 'mock-access-token', expiresAt: Date.now() + 3600000 },
    });
  });

  it('should have id "fcm" and channelType PUSH', () => {
    expect(connector.id).toBe('fcm');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a single POST for one target and return ids and date', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildFcmSuccessResponse());

    const result = await connector.sendMessage(defaultOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();

    const [url, body, config] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe(FCM_SEND_URL);
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-access-token',
      })
    );

    const message = (body as { message: Record<string, unknown> }).message;
    expect(message.token).toBe('device-token-1');

    expect(result).toEqual({
      ids: ['projects/test-project/messages/0:abc123'],
      date: expect.any(String),
    });

    // Verify date is a valid ISO string
    expect(() => new Date(result.date!)).not.toThrow();
  });

  it('should send one POST per token for multiple targets', async () => {
    mockedAxios.post
      .mockResolvedValueOnce(buildFcmSuccessResponse('projects/test-project/messages/0:msg1'))
      .mockResolvedValueOnce(buildFcmSuccessResponse('projects/test-project/messages/0:msg2'))
      .mockResolvedValueOnce(buildFcmSuccessResponse('projects/test-project/messages/0:msg3'));

    const options: IPushOptions = {
      ...defaultOptions,
      target: ['token-a', 'token-b', 'token-c'],
    };

    const result = await connector.sendMessage(options);

    expect(mockedAxios.post).toHaveBeenCalledTimes(3);

    // Each call should target a different device token
    const tokens = mockedAxios.post.mock.calls.map(
      ([, body]) => (body as { message: { token: string } }).message.token
    );
    expect(tokens).toEqual(expect.arrayContaining(['token-a', 'token-b', 'token-c']));

    expect(result.ids).toEqual(expect.arrayContaining([
      'projects/test-project/messages/0:msg1',
      'projects/test-project/messages/0:msg2',
      'projects/test-project/messages/0:msg3',
    ]));
    expect(result.ids).toHaveLength(3);
  });

  it('should build a data message when overrides.type is "data"', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildFcmSuccessResponse());

    const options: IPushOptions = {
      ...defaultOptions,
      overrides: { type: 'data' },
    };

    await connector.sendMessage(options);

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const message = (body as { message: Record<string, unknown> }).message;

    // Data message: title and body go into message.data
    expect(message.data).toEqual(
      expect.objectContaining({
        title: 'Test Title',
        body: 'Test Body',
        key1: 'value1',
        key2: '42', // non-string values are JSON.stringified by cleanPayload
      })
    );

    // No notification field for data messages
    expect(message.notification).toBeUndefined();
  });

  it('should build a notification message by default', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildFcmSuccessResponse());

    await connector.sendMessage(defaultOptions);

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const message = (body as { message: Record<string, unknown> }).message;

    // Notification message: title and body go into message.notification
    expect(message.notification).toEqual({
      title: 'Test Title',
      body: 'Test Body',
    });

    // Payload is placed in message.data
    expect(message.data).toEqual({
      key1: 'value1',
      key2: '42',
    });
  });

  it('should include platform overrides (android, apns, fcmOptions, webPush) in the message', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildFcmSuccessResponse());

    const options: IPushOptions = {
      ...defaultOptions,
      overrides: {
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
        fcmOptions: { analyticsLabel: 'campaign1' },
        webPush: { notification: { icon: '/icon.png' } },
      },
    };

    await connector.sendMessage(options);

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const message = (body as { message: Record<string, unknown> }).message;

    expect(message.android).toEqual({ priority: 'high' });
    expect(message.apns).toEqual({ headers: { apns_priority: '10' } });
    expect(message.fcmOptions).toEqual({ analytics_label: 'campaign1' });
    expect(message.webpush).toEqual({ notification: { icon: '/icon.png' } });
  });

  it('should pass the cached token from the first call into the second call', async () => {
    const firstCache = { accessToken: 'mock-access-token', expiresAt: Date.now() + 3600000 };
    const secondCache = { accessToken: 'mock-access-token-2', expiresAt: Date.now() + 7200000 };

    mockedAuth.getAccessToken
      .mockResolvedValueOnce({ token: 'mock-access-token', cache: firstCache })
      .mockResolvedValueOnce({ token: 'mock-access-token-2', cache: secondCache });

    mockedAxios.post
      .mockResolvedValueOnce(buildFcmSuccessResponse())
      .mockResolvedValueOnce(buildFcmSuccessResponse());

    // First call — no cache yet
    await connector.sendMessage(defaultOptions);

    expect(mockedAuth.getAccessToken).toHaveBeenCalledTimes(1);
    expect(mockedAuth.getAccessToken).toHaveBeenNthCalledWith(
      1,
      defaultConfig.email,
      defaultConfig.secretKey,
      null
    );

    // Second call — should pass the cache returned from the first call
    await connector.sendMessage(defaultOptions);

    expect(mockedAuth.getAccessToken).toHaveBeenCalledTimes(2);
    expect(mockedAuth.getAccessToken).toHaveBeenNthCalledWith(
      2,
      defaultConfig.email,
      defaultConfig.secretKey,
      firstCache
    );
  });

  it('should handle partial failure: first token succeeds, second fails, does not throw', async () => {
    mockedAxios.post
      .mockResolvedValueOnce(buildFcmSuccessResponse('projects/test-project/messages/0:success1'))
      .mockRejectedValueOnce(new Error('FCM send failed'));

    mockedAxios.isAxiosError.mockReturnValue(false);

    const options: IPushOptions = {
      ...defaultOptions,
      target: ['token-ok', 'token-fail'],
    };

    const result = await connector.sendMessage(options);

    // Should NOT throw — partial success is returned
    expect(result.ids).toHaveLength(2);
    expect(result.ids).toContain('projects/test-project/messages/0:success1');
    expect(result.ids).toContain('FCM send failed');
    expect(result.date).toEqual(expect.any(String));
  });

  it('should throw ConnectorError when all targets fail', async () => {
    mockedAxios.post
      .mockRejectedValueOnce(new Error('FCM send failed'))
      .mockRejectedValueOnce(new Error('FCM send failed again'));

    mockedAxios.isAxiosError.mockReturnValue(false);

    const options: IPushOptions = {
      ...defaultOptions,
      target: ['token-fail-1', 'token-fail-2'],
    };

    try {
      await connector.sendMessage(options);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe('All 2 FCM message(s) failed to send');
      expect(connectorErr.statusCode).toBe(500);
      expect(connectorErr.providerMessage).toContain('FCM send failed');
    }
  });

  it('should send a topic-based message when topic is set via passthrough', async () => {
    mockedAxios.post.mockResolvedValueOnce(
      buildFcmSuccessResponse('projects/test-project/messages/0:topic-msg')
    );

    const result = await connector.sendMessage(defaultOptions, {
      _passthrough: {
        body: { topic: 'breaking-news' },
      },
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();

    const [url, body] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe(FCM_SEND_URL);

    const message = (body as { message: Record<string, unknown> }).message;
    expect(message.topic).toBe('breaking-news');

    // Topic messages should NOT have a token field
    expect(message.token).toBeUndefined();

    expect(result).toEqual({
      ids: ['projects/test-project/messages/0:topic-msg'],
      date: expect.any(String),
    });
  });
});
