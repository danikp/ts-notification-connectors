import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { VonageSmsConnector } from './vonage.connector';
import type { VonageConfig } from './vonage.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: VonageConfig = {
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
  from: '15551234567',
};

function buildSuccessResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      'message-count': '1',
      messages: [
        {
          'message-id': 'abc123',
          status: '0',
          to: '14155550100',
          ...overrides,
        },
      ],
    },
  };
}

describe('VonageSmsConnector', () => {
  let connector: VonageSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new VonageSmsConnector(defaultConfig);
  });

  it('should have id "nexmo" and channelType SMS', () => {
    expect(connector.id).toBe('nexmo');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a message successfully with correct URL and form-encoded body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: '14155550100',
      content: 'Hello from Vonage!',
      from: '15559999999',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();

    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    // Verify the URL
    expect(url).toBe('https://rest.nexmo.com/sms/json');

    // Verify Content-Type header
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded',
      })
    );

    // Body is form-encoded string; keys are camelCased by the transform
    const params = new URLSearchParams(body as string);
    expect(params.get('apiKey')).toBe('test-api-key');
    expect(params.get('apiSecret')).toBe('test-api-secret');
    expect(params.get('to')).toBe('14155550100');
    expect(params.get('from')).toBe('15559999999');
    expect(params.get('text')).toBe('Hello from Vonage!');

    // Verify response shape
    expect(result).toEqual({
      id: 'abc123',
      date: expect.any(String),
    });

    // Verify date is a valid ISO string
    expect(() => new Date(result.date!)).not.toThrow();
  });

  it('should use default "from" from config when not provided in options', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '14155550100',
      content: 'Hello!',
      // from is intentionally omitted
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('from')).toBe('15551234567');
  });

  it('should use "from" in options when it overrides the config default', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: '14155550100',
      content: 'Hello!',
      from: '18005550199',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('from')).toBe('18005550199');
  });

  it('should merge bridgeProviderData passthrough body into the request', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      {
        to: '14155550100',
        content: 'Hello!',
      },
      {
        _passthrough: {
          body: {
            callback: 'https://example.com/callback',
            'client-ref': 'my-ref-123',
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);

    // The passthrough values should be present in the form body
    expect(params.get('callback')).toBe('https://example.com/callback');
    expect(params.get('client-ref')).toBe('my-ref-123');

    // Original fields should still be present
    expect(params.get('apiKey')).toBe('test-api-key');
    expect(params.get('to')).toBe('14155550100');
    expect(params.get('text')).toBe('Hello!');
  });

  it('should throw ConnectorError when Vonage returns a non-zero status', async () => {
    mockedAxios.post.mockResolvedValueOnce(
      buildSuccessResponse({
        status: '4',
        'error-text': 'Invalid credentials',
      })
    );

    try {
      await connector.sendMessage({
        to: '14155550100',
        content: 'Hello!',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe('Invalid credentials');
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.providerCode).toBe('4');
      expect(connectorErr.providerMessage).toBe('Invalid credentials');
    }
  });
});
