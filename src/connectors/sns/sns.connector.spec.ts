import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SnsSmsConnector } from './sns.connector';
import type { SnsConfig } from './sns.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: SnsConfig = {
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};

const snsSuccessXml = `<PublishResponse xmlns="https://sns.amazonaws.com/doc/2010-03-31/">
  <PublishResult>
    <MessageId>abc-123-def-456</MessageId>
  </PublishResult>
  <ResponseMetadata>
    <RequestId>req-789</RequestId>
  </ResponseMetadata>
</PublishResponse>`;

const snsErrorXml = `<ErrorResponse xmlns="https://sns.amazonaws.com/doc/2010-03-31/">
  <Error>
    <Type>Sender</Type>
    <Code>InvalidParameter</Code>
    <Message>Invalid parameter: PhoneNumber</Message>
  </Error>
  <RequestId>req-err-001</RequestId>
</ErrorResponse>`;

describe('SnsSmsConnector', () => {
  let connector: SnsSmsConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SnsSmsConnector(defaultConfig);
  });

  it('should have id "sns" and channelType SMS', () => {
    expect(connector.id).toBe('sns');
    expect(connector.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should send a message successfully with correct URL and form-encoded body', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: snsSuccessXml });

    const result = await connector.sendMessage({
      to: '+14155550100',
      content: 'Hello from SNS!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();

    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://sns.us-east-1.amazonaws.com/');

    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded',
      })
    );

    // Body is form-encoded; keys are PascalCased by the transform
    const params = new URLSearchParams(body as string);
    expect(params.get('Action')).toBe('Publish');
    expect(params.get('PhoneNumber')).toBe('+14155550100');
    expect(params.get('Message')).toBe('Hello from SNS!');

    expect(result).toEqual({
      id: 'abc-123-def-456',
      date: expect.any(String),
    });

    expect(() => new Date(result.date!)).not.toThrow();
  });

  it('should use the configured region in the endpoint URL', async () => {
    const euConnector = new SnsSmsConnector({
      ...defaultConfig,
      region: 'eu-west-1',
    });

    mockedAxios.post.mockResolvedValueOnce({ data: snsSuccessXml });

    await euConnector.sendMessage({
      to: '+441234567890',
      content: 'Hello EU!',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://sns.eu-west-1.amazonaws.com/');
  });

  it('should sign the request with AWS Signature V4 (aws4)', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: snsSuccessXml });

    await connector.sendMessage({
      to: '+14155550100',
      content: 'Test',
    });

    const [, , config] = mockedAxios.post.mock.calls[0]!;
    const headers = config?.headers as Record<string, string>;

    // aws4 adds Authorization and X-Amz-Date headers
    expect(headers).toHaveProperty('Authorization');
    expect(headers.Authorization).toContain('AWS4-HMAC-SHA256');
    expect(headers).toHaveProperty('X-Amz-Date');
  });

  it('should merge bridgeProviderData passthrough body into the request', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: snsSuccessXml });

    await connector.sendMessage(
      {
        to: '+14155550100',
        content: 'Hello!',
      },
      {
        _passthrough: {
          body: {
            MessageAttributes: 'custom-value',
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);

    expect(params.get('MessageAttributes')).toBe('custom-value');
    expect(params.get('Action')).toBe('Publish');
    expect(params.get('PhoneNumber')).toBe('+14155550100');
  });

  it('should merge bridgeProviderData passthrough headers into the request', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: snsSuccessXml });

    await connector.sendMessage(
      {
        to: '+14155550100',
        content: 'Hello!',
      },
      {
        _passthrough: {
          headers: {
            'X-Custom-Header': 'custom-value',
          },
        },
      }
    );

    const [, , config] = mockedAxios.post.mock.calls[0]!;
    const headers = config?.headers as Record<string, string>;
    expect(headers['X-Custom-Header']).toBe('custom-value');
  });

  it('should throw ConnectorError with provider details on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: snsErrorXml,
      },
    };

    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        to: 'invalid-number',
        content: 'Test',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe('Invalid parameter: PhoneNumber');
      expect(connectorErr.statusCode).toBe(400);
      expect(connectorErr.providerCode).toBe('InvalidParameter');
      expect(connectorErr.providerMessage).toBe(
        'Invalid parameter: PhoneNumber'
      );
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        to: '+14155550100',
        content: 'Test',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe('Network failure');
      expect(connectorErr.statusCode).toBe(500);
    }
  });

  it('should return empty string as id when MessageId is not in XML response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: '<PublishResponse><PublishResult></PublishResult></PublishResponse>',
    });

    const result = await connector.sendMessage({
      to: '+14155550100',
      content: 'Test',
    });

    expect(result.id).toBe('');
    expect(result.date).toEqual(expect.any(String));
  });
});
