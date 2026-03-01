import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { PushoverPushConnector } from './pushover.connector';
import type { PushoverConfig } from './pushover.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: PushoverConfig = {
  token: 'pushover-app-token',
};

const defaultPushOptions = {
  target: ['user-key-1'],
  title: 'Test Title',
  content: 'Test Content',
  payload: {},
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

function buildSuccessResponse() {
  return {
    data: {
      status: 1,
      request: 'pushover-req-123',
    },
  };
}

describe('PushoverPushConnector', () => {
  let connector: PushoverPushConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new PushoverPushConnector(defaultConfig);
  });

  it('should have id "pushover" and channelType PUSH', () => {
    expect(connector.id).toBe('pushover');
    expect(connector.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should send a form-encoded message and return { ids, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage(defaultPushOptions);

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.pushover.net/1/messages.json');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded',
      })
    );

    const params = new URLSearchParams(body as string);
    expect(params.get('token')).toBe('pushover-app-token');
    expect(params.get('user')).toBe('user-key-1');
    expect(params.get('title')).toBe('Test Title');
    expect(params.get('message')).toBe('Test Content');

    expect(result).toEqual({
      ids: ['pushover-req-123'],
      date: expect.any(String),
    });
  });

  it('should send to multiple targets using Promise.allSettled', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { status: 1, request: 'req-1' } })
      .mockResolvedValueOnce({ data: { status: 1, request: 'req-2' } });

    const result = await connector.sendMessage({
      ...defaultPushOptions,
      target: ['user-key-1', 'user-key-2'],
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(result.ids).toEqual(['req-1', 'req-2']);
  });

  it('should throw ConnectorError when Pushover returns status 0', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: 0,
        request: 'req-fail',
        errors: ['application token is invalid'],
      },
    });

    try {
      await connector.sendMessage(defaultPushOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toContain('Pushover push message(s) failed');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 400,
        data: { status: 0, errors: ['application token is invalid'] },
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
      expect(connectorErr.message).toContain('Pushover push message(s) failed');
    }
  });

  it('should use overrides for title and body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      ...defaultPushOptions,
      overrides: { title: 'Override Title', body: 'Override Body' },
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('title')).toBe('Override Title');
    expect(params.get('message')).toBe('Override Body');
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage(defaultPushOptions);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toContain('Pushover push message(s) failed');
    }
  });
});
