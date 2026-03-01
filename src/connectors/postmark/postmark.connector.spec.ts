import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { PostmarkEmailConnector } from './postmark.connector';
import type { PostmarkConfig } from './postmark.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: PostmarkConfig = {
  serverToken: 'pm-test-token',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return {
    data: {
      To: 'recipient@example.com',
      SubmittedAt: '2024-01-01T00:00:00Z',
      MessageID: 'pm-msg-123',
      ErrorCode: 0,
      Message: 'OK',
    },
  };
}

describe('PostmarkEmailConnector', () => {
  let connector: PostmarkEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new PostmarkEmailConnector(defaultConfig);
  });

  it('should have id "postmark" and channelType EMAIL', () => {
    expect(connector.id).toBe('postmark');
    expect(connector.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should send a PascalCase JSON message with X-Postmark-Server-Token and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      html: '<p>Hello!</p>',
      text: 'Hello!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.postmarkapp.com/email');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': 'pm-test-token',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.From).toBe('Test Sender <sender@example.com>');
    expect(parsedBody.To).toBe('recipient@example.com');
    expect(parsedBody.Subject).toBe('Test Subject');
    expect(parsedBody.HtmlBody).toBe('<p>Hello!</p>');
    expect(parsedBody.TextBody).toBe('Hello!');

    expect(result).toEqual({
      id: 'pm-msg-123',
      date: expect.any(String),
    });
  });

  it('should include Cc, Bcc, and ReplyTo when provided', async () => {
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

    expect(parsedBody.Cc).toBe('cc@example.com');
    expect(parsedBody.Bcc).toBe('bcc@example.com');
    expect(parsedBody.ReplyTo).toBe('reply@example.com');
  });

  it('should map attachments to Postmark format', async () => {
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
    const attachments = parsedBody.Attachments as Array<Record<string, string>>;

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual({
      Name: 'report.pdf',
      Content: fileBuffer.toString('base64'),
      ContentType: 'application/pdf',
    });
  });

  it('should throw ConnectorError when Postmark returns non-zero ErrorCode', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        ErrorCode: 300,
        Message: 'Invalid email request',
        MessageID: '',
        To: '',
        SubmittedAt: '',
      },
    });

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
      expect(connectorErr.providerCode).toBe('300');
      expect(connectorErr.providerMessage).toBe('Invalid email request');
    }
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { ErrorCode: 10, Message: 'Bad or missing Server API token.' },
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
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerMessage).toBe('Bad or missing Server API token.');
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
