import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ResendEmailConnector } from './resend.connector';
import type { ResendConfig } from './resend.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: ResendConfig = {
  apiKey: 're_test_123',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return { data: { id: 'resend-msg-123' } };
}

describe('ResendEmailConnector', () => {
  let connector: ResendEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new ResendEmailConnector(defaultConfig);
  });

  it('should have id "resend" and channelType EMAIL', () => {
    expect(connector.id).toBe('resend');
    expect(connector.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should send a JSON message with Bearer auth and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      html: '<p>Hello!</p>',
      text: 'Hello!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.resend.com/emails');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer re_test_123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.from).toBe('Test Sender <sender@example.com>');
    expect(parsedBody.to).toEqual(['recipient@example.com']);
    expect(parsedBody.subject).toBe('Test Subject');
    expect(parsedBody.html).toBe('<p>Hello!</p>');
    expect(parsedBody.text).toBe('Hello!');

    expect(result).toEqual({
      id: 'resend-msg-123',
      date: expect.any(String),
    });
  });

  it('should include cc, bcc, and reply_to when provided', async () => {
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

    expect(parsedBody.cc).toEqual(['cc@example.com']);
    expect(parsedBody.bcc).toEqual(['bcc@example.com']);
    expect(parsedBody.reply_to).toBe('reply@example.com');
  });

  it('should map attachments to Resend format', async () => {
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
    const attachments = parsedBody.attachments as Array<Record<string, string>>;

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual({
      filename: 'report.pdf',
      content: fileBuffer.toString('base64'),
      content_type: 'application/pdf',
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: ['recipient@example.com'], subject: 'Test', html: '<p>Test</p>' },
      { _passthrough: { body: { tags: [{ name: 'env', value: 'test' }] } } }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.tags).toEqual([{ name: 'env', value: 'test' }]);
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 422,
        data: { name: 'validation_error', message: 'Invalid email' },
      },
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        to: ['invalid'],
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.statusCode).toBe(422);
      expect(connectorErr.providerCode).toBe('validation_error');
      expect(connectorErr.providerMessage).toBe('Invalid email');
    }
  });

  it('should use senderName from options over config', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
      senderName: 'Override Sender',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    expect((body as Record<string, unknown>).from).toBe(
      'Override Sender <sender@example.com>'
    );
  });
});
