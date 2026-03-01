import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SparkPostEmailConnector } from './sparkpost.connector';
import type { SparkPostConfig } from './sparkpost.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: SparkPostConfig = {
  apiKey: 'sp-test-key-123',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return {
    data: {
      results: {
        total_rejected_recipients: 0,
        total_accepted_recipients: 1,
        id: 'sp-msg-123',
      },
    },
  };
}

describe('SparkPostEmailConnector', () => {
  let connector: SparkPostEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SparkPostEmailConnector(defaultConfig);
  });

  it('should have id "sparkpost" and channelType EMAIL', () => {
    expect(connector.id).toBe('sparkpost');
    expect(connector.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should send a JSON message with raw API key Authorization and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      html: '<p>Hello!</p>',
      text: 'Hello!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.sparkpost.com/api/v1/transmissions');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'sp-test-key-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.recipients).toEqual([
      { address: { email: 'recipient@example.com' } },
    ]);

    const content = parsedBody.content as Record<string, unknown>;
    expect(content.from).toEqual({ email: 'sender@example.com', name: 'Test Sender' });
    expect(content.subject).toBe('Test Subject');
    expect(content.html).toBe('<p>Hello!</p>');
    expect(content.text).toBe('Hello!');

    expect(result).toEqual({
      id: 'sp-msg-123',
      date: expect.any(String),
    });
  });

  it('should use EU endpoint when region is "eu"', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const euConnector = new SparkPostEmailConnector({
      ...defaultConfig,
      region: 'eu',
    });

    await euConnector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://api.eu.sparkpost.com/api/v1/transmissions');
  });

  it('should include cc and bcc as additional recipients', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
      replyTo: 'reply@example.com',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    const recipients = parsedBody.recipients as Array<Record<string, unknown>>;

    expect(recipients).toEqual([
      { address: { email: 'recipient@example.com' } },
      { address: { email: 'cc@example.com' } },
      { address: { email: 'bcc@example.com' } },
    ]);

    const content = parsedBody.content as Record<string, unknown>;
    expect(content.reply_to).toBe('reply@example.com');
  });

  it('should map attachments to SparkPost format', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const fileBuffer = Buffer.from('file-content');
    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Attachment Test',
      html: '<p>See attached</p>',
      attachments: [
        { mime: 'application/pdf', file: fileBuffer, name: 'report.pdf' },
      ],
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    const content = parsedBody.content as Record<string, unknown>;
    const attachments = content.attachments as Array<Record<string, string>>;

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual({
      name: 'report.pdf',
      type: 'application/pdf',
      data: fileBuffer.toString('base64'),
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: ['recipient@example.com'], subject: 'Test', html: '<p>Test</p>' },
      { _passthrough: { body: { options: { open_tracking: true } } } }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.options).toEqual({ open_tracking: true });
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 403,
        data: { errors: [{ code: '1902', message: 'Forbidden' }] },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(403);
      expect(connectorErr.providerCode).toBe('1902');
      expect(connectorErr.providerMessage).toBe('Forbidden');
    }
  });

  it('should throw ConnectorError for non-axios errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network failure'));
    mockedAxios.isAxiosError.mockReturnValue(false);

    try {
      await connector.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      expect((err as ConnectorError).message).toBe('Network failure');
    }
  });
});
