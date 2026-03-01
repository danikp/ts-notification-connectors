import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { NtfyPushConnector } from './ntfy.connector';
import type { NtfyConfig } from './ntfy.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: NtfyConfig = {
  baseUrl: 'https://ntfy.example.com',
  token: 'test-token',
};

const defaultPushOptions = {
  target: ['target-1'],
  title: 'Test Title',
  content: 'Test Content',
  payload: {},
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function buildSuccessResponse(topic = 'target-1') {
  return {
    data: {
      id: 'ntfy-msg-123',
      time: 1700000000,
      expires: 1700086400,
      event: 'message',
      topic,
      message: 'Test Content',
      title: 'Test Title',
    },
  };
}

describe('NtfyPushConnector', () => {
  let connector: NtfyPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new NtfyPushConnector(defaultConfig);
  });

  it('should have id "ntfy" and channelType PUSH', () => {
    expect(connector.id).toBe('ntfy');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a JSON message with Bearer auth and return { ids, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultPushOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://ntfy.example.com');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.topic).toBe('target-1');
    expect(parsedBody.title).toBe('Test Title');
    expect(parsedBody.message).toBe('Test Content');

    expect(result).toEqual({
      ids: ['ntfy-msg-123'],
      date: expect.any(String),
    });
  });

  it('should default to https://ntfy.sh when no baseUrl is configured', async () => {
    const connectorNoBase = new NtfyPushConnector({});
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connectorNoBase.sendMessage(defaultPushOptions);

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://ntfy.sh');
  });

  it('should not include Authorization header when no token is configured', async () => {
    const connectorNoToken = new NtfyPushConnector({ baseUrl: 'https://ntfy.sh' });
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connectorNoToken.sendMessage(defaultPushOptions);

    const [, , config] = mockedAxios.post.mock.calls[0]!;
    expect(config?.headers).not.toHaveProperty('Authorization');
  });

  it('should send to multiple targets using Promise.allSettled', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { id: 'msg-1', time: 0, expires: 0, event: 'message', topic: 'topic-1', message: '' } })
      .mockResolvedValueOnce({ data: { id: 'msg-2', time: 0, expires: 0, event: 'message', topic: 'topic-2', message: '' } });

    const result = await connector.sendMessage({
      ...defaultPushOptions,
      target: ['topic-1', 'topic-2'],
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(result.ids).toEqual(['msg-1', 'msg-2']);
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
    expect(parsedBody.message).toBe('Override Body');
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(defaultPushOptions, {
      _passthrough: {
        body: {
          priority: 5,
          tags: ['warning'],
        },
      },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.priority).toBe(5);
    expect(parsedBody.tags).toEqual(['warning']);
    expect(parsedBody.topic).toBe('target-1');
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
      expect(connectorErr.message).toContain('ntfy push message(s) failed');
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
      expect((err as ConnectorError).message).toContain('ntfy push message(s) failed');
    }
  });
});
