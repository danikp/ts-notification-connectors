import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ExpoPushConnector } from './expo.connector';
import type { ExpoConfig } from './expo.config';
import type { IPushOptions } from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: ExpoConfig = {
  accessToken: 'expo-test-token',
};

const defaultOptions: IPushOptions = {
  target: ['ExponentPushToken[test-token-1]'],
  title: 'Test Title',
  content: 'Test Body',
  payload: { key1: 'value1' },
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function buildSuccessResponse(ids: string[] = ['ticket-id-1']) {
  return {
    data: {
      data: ids.map((id) => ({ status: 'ok' as const, id })),
    },
  };
}

describe('ExpoPushConnector', () => {
  let connector: ExpoPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new ExpoPushConnector(defaultConfig);
  });

  it('should have id "expo" and channelType PUSH', () => {
    expect(connector.id).toBe('expo');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send JSON to correct URL with Bearer auth', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, , config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer expo-test-token',
      })
    );

    expect(result).toEqual({
      ids: ['ticket-id-1'],
      date: expect.any(String),
    });
  });

  it('should not include Authorization header when accessToken is not provided', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const noAuthConnector = new ExpoPushConnector({});
    await noAuthConnector.sendMessage(defaultOptions);

    const [, , config] = mockedAxios.post.mock.calls[0]!;
    expect(config?.headers).not.toHaveProperty('Authorization');
  });

  it('should include title, body, and data payload in request', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(defaultOptions);

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;

    expect(parsedBody.to).toBe('ExponentPushToken[test-token-1]');
    expect(parsedBody.title).toBe('Test Title');
    expect(parsedBody.body).toBe('Test Body');
    expect(parsedBody.data).toEqual({ key1: 'value1' });
  });

  it('should include overrides (sound, badge) in request', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const options: IPushOptions = {
      ...defaultOptions,
      overrides: { sound: 'default', badge: 5 },
    };
    await connector.sendMessage(options);

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.sound).toBe('default');
    expect(parsedBody.badge).toBe(5);
  });

  it('should handle partial failure: mix of ok and error tickets', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: [
          { status: 'ok', id: 'ticket-ok' },
          { status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } },
        ],
      },
    });

    const options: IPushOptions = {
      ...defaultOptions,
      target: ['ExponentPushToken[ok]', 'ExponentPushToken[bad]'],
    };

    const result = await connector.sendMessage(options);

    expect(result.ids).toHaveLength(2);
    expect(result.ids).toContain('ticket-ok');
    expect(result.ids).toContain('DeviceNotRegistered');
  });

  it('should throw ConnectorError when all tickets fail', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: [
          { status: 'error', message: 'DeviceNotRegistered' },
        ],
      },
    });

    try {
      await connector.sendMessage(defaultOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe('All 1 Expo push message(s) failed');
      expect(connectorErr.providerMessage).toContain('DeviceNotRegistered');
    }
  });

  it('should throw ConnectorError on HTTP error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 429,
        data: { errors: [{ code: 'RATE_LIMIT', message: 'Rate limited' }] },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage(defaultOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(429);
      expect(connectorErr.providerCode).toBe('RATE_LIMIT');
    }
  });
});
