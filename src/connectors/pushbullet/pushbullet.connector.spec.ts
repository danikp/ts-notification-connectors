import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { PushbulletPushConnector } from './pushbullet.connector';
import type { PushbulletConfig } from './pushbullet.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: PushbulletConfig = {
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

function buildSuccessResponse(iden = 'push-iden-123') {
  return {
    data: {
      iden,
      active: true,
      type: 'note',
      title: 'Test Title',
      body: 'Test Content',
      created: 1700000000,
      modified: 1700000000,
    },
  };
}

describe('PushbulletPushConnector', () => {
  let connector: PushbulletPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new PushbulletPushConnector(defaultConfig);
  });

  it('should have id "pushbullet" and channelType PUSH', () => {
    expect(connector.id).toBe('pushbullet');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a JSON message with Access-Token header and return { ids, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultPushOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.pushbullet.com/v2/pushes');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'Access-Token': 'test-access-token',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.type).toBe('note');
    expect(parsedBody.title).toBe('Test Title');
    expect(parsedBody.body).toBe('Test Content');
    expect(parsedBody.device_iden).toBe('target-1');

    expect(result).toEqual({
      ids: ['push-iden-123'],
      date: expect.any(String),
    });
  });

  it('should send to multiple targets using Promise.allSettled', async () => {
    mockedAxios.post
      .mockResolvedValueOnce(buildSuccessResponse('iden-1'))
      .mockResolvedValueOnce(buildSuccessResponse('iden-2'));

    const result = await connector.sendMessage({
      ...defaultPushOptions,
      target: ['device-1', 'device-2'],
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(result.ids).toEqual(['iden-1', 'iden-2']);
  });

  it('should use overrides for title and body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      overrides: { title: 'Override Title', body: 'Override Body' },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.title).toBe('Override Title');
    expect(parsedBody.body).toBe('Override Body');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(defaultPushOptions, {
      _passthrough: {
        body: {
          source_device_iden: 'source-device-123',
        },
      },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.source_device_iden).toBe('source-device-123');
    expect(parsedBody.title).toBe('Test Title');
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
      expect(connectorErr.message).toContain('Pushbullet push message(s) failed');
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
      expect((err as ConnectorError).message).toContain('Pushbullet push message(s) failed');
    }
  });
});
