import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { BrevoEmailConnector } from './brevo.connector';
import type { BrevoConfig } from './brevo.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: BrevoConfig = {
  apiKey: 'xkeysib-test-123',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return {
    data: { messageId: '<brevo-msg-123@example.com>' },
  };
}

describe('BrevoEmailConnector', () => {
  let connector: BrevoEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new BrevoEmailConnector(defaultConfig);
  });

  it('should have id "brevo" and channelType EMAIL', () => {
    expect(connector.id).toBe('brevo');
    expect(connector.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should send a JSON message with api-key header and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      html: '<p>Hello!</p>',
      text: 'Hello!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'api-key': 'xkeysib-test-123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.sender).toEqual({ name: 'Test Sender', email: 'sender@example.com' });
    expect(parsedBody.to).toEqual([{ email: 'recipient@example.com' }]);
    expect(parsedBody.subject).toBe('Test Subject');
    expect(parsedBody.htmlContent).toBe('<p>Hello!</p>');
    expect(parsedBody.textContent).toBe('Hello!');

    expect(result).toEqual({
      id: '<brevo-msg-123@example.com>',
      date: expect.any(String),
    });
  });

  it('should include cc, bcc, and replyTo when provided', async () => {
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

    expect(parsedBody.cc).toEqual([{ email: 'cc@example.com' }]);
    expect(parsedBody.bcc).toEqual([{ email: 'bcc@example.com' }]);
    expect(parsedBody.replyTo).toEqual({ email: 'reply@example.com' });
  });

  it('should map attachments to Brevo format', async () => {
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
    const attachment = parsedBody.attachment as Array<Record<string, string>>;

    expect(attachment).toHaveLength(1);
    expect(attachment[0]).toEqual({
      name: 'report.pdf',
      content: fileBuffer.toString('base64'),
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: ['recipient@example.com'], subject: 'Test', html: '<p>Test</p>' },
      { _passthrough: { body: { tags: ['transactional'] } } }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.tags).toEqual(['transactional']);
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { code: 'unauthorized', message: 'Key not found' },
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
      expect(connectorErr.providerMessage).toBe('Key not found');
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
