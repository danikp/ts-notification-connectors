import { describe, it, expect, vi, beforeEach } from 'vitest';
import http2 from 'http2';
import * as apnsAuth from './apns.auth';
import { ApnsPushConnector } from './apns.connector';
import type { ApnsConfig } from './apns.config';
import type { IPushOptions } from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('http2');
vi.mock('./apns.auth');

const mockedHttp2 = vi.mocked(http2, true);
const mockedAuth = vi.mocked(apnsAuth, true);

const defaultConfig: ApnsConfig = {
  key: '-----BEGIN PRIVATE KEY-----\nfake-key\n-----END PRIVATE KEY-----',
  keyId: 'KEY123456',
  teamId: 'TEAM123456',
  bundleId: 'com.example.app',
  production: true,
};

const defaultOptions: IPushOptions = {
  target: ['device-token-abc'],
  title: 'Test Title',
  content: 'Test Body',
  payload: { key1: 'value1' },
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function createMockStream(
  statusCode: number,
  headers: Record<string, string> = {},
  body = ''
) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const stream = {
    on(event: string, handler: (...args: unknown[]) => void) {
      handlers[event] = handlers[event] || [];
      handlers[event]!.push(handler);
      return stream;
    },
    write: vi.fn(),
    end: vi.fn().mockImplementation(() => {
      process.nextTick(() => {
        for (const h of handlers['response'] || []) {
          h({ ':status': statusCode, ...headers });
        }
        if (body) {
          for (const h of handlers['data'] || []) h(Buffer.from(body));
        }
        for (const h of handlers['end'] || []) h();
      });
    }),
  };
  return stream;
}

function createMockSession(
  streams: ReturnType<typeof createMockStream>[]
) {
  let callIndex = 0;
  const sessionHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    request: vi.fn().mockImplementation(() => streams[callIndex++]),
    close: vi.fn(),
    on(event: string, handler: (...args: unknown[]) => void) {
      sessionHandlers[event] = sessionHandlers[event] || [];
      sessionHandlers[event]!.push(handler);
      return this;
    },
    destroy: vi.fn(),
  };
}

describe('ApnsPushConnector', () => {
  let connector: ApnsPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new ApnsPushConnector(defaultConfig);

    mockedAuth.getOrCacheToken.mockReturnValue({
      token: 'mock-apns-jwt',
      cache: { token: 'mock-apns-jwt', expiresAt: Date.now() + 3000000 },
    });
  });

  it('should have id "apns" and channelType PUSH', () => {
    expect(connector.id).toBe('apns');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send HTTP/2 request to production host and return apns-id', async () => {
    const stream = createMockStream(200, { 'apns-id': 'apns-uuid-123' });
    const session = createMockSession([stream]);
    mockedHttp2.connect.mockReturnValue(session as unknown as http2.ClientHttp2Session);

    const result = await connector.sendMessage(defaultOptions);

    expect(mockedHttp2.connect).toHaveBeenCalledWith('https://api.push.apple.com');
    expect(session.request).toHaveBeenCalledOnce();

    const requestHeaders = session.request.mock.calls[0]![0] as Record<string, string>;
    expect(requestHeaders[':method']).toBe('POST');
    expect(requestHeaders[':path']).toBe('/3/device/device-token-abc');
    expect(requestHeaders['authorization']).toBe('bearer mock-apns-jwt');
    expect(requestHeaders['apns-topic']).toBe('com.example.app');
    expect(requestHeaders['apns-push-type']).toBe('alert');

    const writtenBody = JSON.parse(stream.write.mock.calls[0]![0] as string);
    expect(writtenBody.aps.alert.title).toBe('Test Title');
    expect(writtenBody.aps.alert.body).toBe('Test Body');

    expect(result).toEqual({
      ids: ['apns-uuid-123'],
      date: expect.any(String),
    });

    expect(session.close).toHaveBeenCalled();
  });

  it('should use sandbox host when production is false', async () => {
    const sandboxConnector = new ApnsPushConnector({
      ...defaultConfig,
      production: false,
    });

    const stream = createMockStream(200, { 'apns-id': 'sandbox-id' });
    const session = createMockSession([stream]);
    mockedHttp2.connect.mockReturnValue(session as unknown as http2.ClientHttp2Session);

    await sandboxConnector.sendMessage(defaultOptions);

    expect(mockedHttp2.connect).toHaveBeenCalledWith(
      'https://api.sandbox.push.apple.com'
    );
  });

  it('should send one HTTP/2 request per target token', async () => {
    const stream1 = createMockStream(200, { 'apns-id': 'id-1' });
    const stream2 = createMockStream(200, { 'apns-id': 'id-2' });
    const session = createMockSession([stream1, stream2]);
    mockedHttp2.connect.mockReturnValue(session as unknown as http2.ClientHttp2Session);

    const options: IPushOptions = {
      ...defaultOptions,
      target: ['token-a', 'token-b'],
    };

    const result = await connector.sendMessage(options);

    expect(session.request).toHaveBeenCalledTimes(2);
    expect(result.ids).toEqual(expect.arrayContaining(['id-1', 'id-2']));
    expect(result.ids).toHaveLength(2);
  });

  it('should handle partial failure without throwing', async () => {
    const stream1 = createMockStream(200, { 'apns-id': 'id-ok' });
    const stream2 = createMockStream(
      410,
      {},
      JSON.stringify({ reason: 'Unregistered' })
    );
    const session = createMockSession([stream1, stream2]);
    mockedHttp2.connect.mockReturnValue(session as unknown as http2.ClientHttp2Session);

    const options: IPushOptions = {
      ...defaultOptions,
      target: ['token-ok', 'token-bad'],
    };

    const result = await connector.sendMessage(options);

    expect(result.ids).toHaveLength(2);
    expect(result.ids).toContain('id-ok');
    expect(result.ids).toContain('Unregistered');
  });

  it('should throw ConnectorError when all targets fail', async () => {
    const stream = createMockStream(
      400,
      {},
      JSON.stringify({ reason: 'BadDeviceToken' })
    );
    const session = createMockSession([stream]);
    mockedHttp2.connect.mockReturnValue(session as unknown as http2.ClientHttp2Session);

    try {
      await connector.sendMessage(defaultOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe(
        'All 1 APNs message(s) failed to send'
      );
      expect(connectorErr.providerMessage).toContain('BadDeviceToken');
    }
  });

  it('should cache JWT across calls', async () => {
    const firstCache = { token: 'jwt-1', expiresAt: Date.now() + 3000000 };
    const secondCache = { token: 'jwt-1', expiresAt: Date.now() + 3000000 };

    mockedAuth.getOrCacheToken
      .mockReturnValueOnce({ token: 'jwt-1', cache: firstCache })
      .mockReturnValueOnce({ token: 'jwt-1', cache: secondCache });

    const stream1 = createMockStream(200, { 'apns-id': 'id-1' });
    const stream2 = createMockStream(200, { 'apns-id': 'id-2' });
    const session1 = createMockSession([stream1]);
    const session2 = createMockSession([stream2]);

    mockedHttp2.connect
      .mockReturnValueOnce(session1 as unknown as http2.ClientHttp2Session)
      .mockReturnValueOnce(session2 as unknown as http2.ClientHttp2Session);

    await connector.sendMessage(defaultOptions);
    await connector.sendMessage(defaultOptions);

    expect(mockedAuth.getOrCacheToken).toHaveBeenCalledTimes(2);
    expect(mockedAuth.getOrCacheToken).toHaveBeenNthCalledWith(
      1,
      'KEY123456',
      'TEAM123456',
      defaultConfig.key,
      null
    );
    expect(mockedAuth.getOrCacheToken).toHaveBeenNthCalledWith(
      2,
      'KEY123456',
      'TEAM123456',
      defaultConfig.key,
      firstCache
    );
  });

  it('should include custom payload data in the APNs body', async () => {
    const stream = createMockStream(200, { 'apns-id': 'id-1' });
    const session = createMockSession([stream]);
    mockedHttp2.connect.mockReturnValue(session as unknown as http2.ClientHttp2Session);

    await connector.sendMessage({
      ...defaultOptions,
      payload: { orderId: '12345', type: 'order_update' },
    });

    const writtenBody = JSON.parse(stream.write.mock.calls[0]![0] as string);
    expect(writtenBody.orderId).toBe('12345');
    expect(writtenBody.type).toBe('order_update');
  });
});
