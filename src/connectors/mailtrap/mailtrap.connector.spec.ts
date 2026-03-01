import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MailtrapEmailConnector } from './mailtrap.connector';
import type { MailtrapConfig } from './mailtrap.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: MailtrapConfig = {
  apiToken: 'mt_test_123',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return {
    data: {
      success: true,
      message_ids: ['mt-msg-123'],
    },
  };
}

describe('MailtrapEmailConnector', () => {
  let connector: MailtrapEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new MailtrapEmailConnector(defaultConfig);
  });

  it('should have id "mailtrap" and channelType EMAIL', () => {
    expect(connector.id).toBe('mailtrap');
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

    expect(url).toBe('https://send.api.mailtrap.io/api/send');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mt_test_123',
      })
    );

    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.from).toEqual({ email: 'sender@example.com', name: 'Test Sender' });
    expect(parsedBody.to).toEqual([{ email: 'recipient@example.com' }]);
    expect(parsedBody.subject).toBe('Test Subject');
    expect(parsedBody.html).toBe('<p>Hello!</p>');
    expect(parsedBody.text).toBe('Hello!');

    expect(result).toEqual({
      id: 'mt-msg-123',
      date: expect.any(String),
    });
  });

  it('should include cc and bcc when provided', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;

    expect(parsedBody.cc).toEqual([{ email: 'cc@example.com' }]);
    expect(parsedBody.bcc).toEqual([{ email: 'bcc@example.com' }]);
  });

  it('should map attachments to Mailtrap format', async () => {
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
      type: 'application/pdf',
    });
  });

  it('should merge bridgeProviderData passthrough body', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage(
      { to: ['recipient@example.com'], subject: 'Test', html: '<p>Test</p>' },
      { _passthrough: { body: { category: 'transactional' } } }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = body as Record<string, unknown>;
    expect(parsedBody.category).toBe('transactional');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 401,
        data: { error: 'unauthorized', message: 'Invalid API token' },
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
      expect(connectorErr.providerMessage).toBe('Invalid API token');
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
