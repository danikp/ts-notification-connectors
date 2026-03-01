import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SendgridEmailConnector } from './sendgrid.connector';
import type { SendgridConfig } from './sendgrid.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: SendgridConfig = {
  apiKey: 'SG.test_key',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return {
    data: {},
    headers: { 'x-message-id': 'sg-msg-123' },
  };
}

describe('SendgridEmailConnector', () => {
  let connector: SendgridEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SendgridEmailConnector(defaultConfig);
  });

  it('should have id "sendgrid" and channelType EMAIL', () => {
    expect(connector.id).toBe('sendgrid');
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

    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer SG.test_key',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.from).toEqual({ email: 'sender@example.com', name: 'Test Sender' });
    expect(parsedBody.personalizations).toEqual([
      { to: [{ email: 'recipient@example.com' }], subject: 'Test Subject' },
    ]);
    expect(parsedBody.content).toEqual([
      { type: 'text/plain', value: 'Hello!' },
      { type: 'text/html', value: '<p>Hello!</p>' },
    ]);

    expect(result).toEqual({
      id: 'sg-msg-123',
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
    const personalizations = (parsedBody.personalizations as Record<string, unknown>[])[0]!;

    expect(personalizations.cc).toEqual([{ email: 'cc@example.com' }]);
    expect(personalizations.bcc).toEqual([{ email: 'bcc@example.com' }]);
    expect(parsedBody.reply_to).toEqual({ email: 'reply@example.com' });
  });

  it('should map attachments to SendGrid format', async () => {
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
      content: fileBuffer.toString('base64'),
      type: 'application/pdf',
      filename: 'report.pdf',
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: ['recipient@example.com'], subject: 'Test', html: '<p>Test</p>' },
      { _passthrough: { body: { tracking_settings: { click_tracking: { enable: true } } } } }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.tracking_settings).toBeDefined();
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { errors: [{ message: 'The provided authorization grant is invalid', field: 'authorization' }] },
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
      expect(connectorErr.providerMessage).toBe('The provided authorization grant is invalid');
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
