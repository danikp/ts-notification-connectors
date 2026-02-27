import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MailgunEmailConnector } from './mailgun.connector';
import type { MailgunConfig } from './mailgun.config';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const defaultConfig: MailgunConfig = {
  apiKey: 'key-test123',
  domain: 'mg.example.com',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSuccessResponse() {
  return {
    data: {
      id: '<20230101120000.abc@mg.example.com>',
      message: 'Queued. Thank you.',
    },
  };
}

describe('MailgunEmailConnector', () => {
  let connector: MailgunEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new MailgunEmailConnector(defaultConfig);
  });

  it('should have id "mailgun" and channelType EMAIL', () => {
    expect(connector.id).toBe('mailgun');
    expect(connector.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should send form-encoded message with Basic auth to correct URL', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const result = await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      html: '<p>Hello!</p>',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();
    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    expect(url).toBe('https://api.mailgun.net/v3/mg.example.com/messages');

    const expectedAuth = Buffer.from('api:key-test123').toString('base64');
    expect(config?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${expectedAuth}`,
      })
    );

    const params = new URLSearchParams(body as string);
    expect(params.get('from')).toBe('Test Sender <sender@example.com>');
    expect(params.get('to')).toBe('recipient@example.com');
    expect(params.get('subject')).toBe('Test Subject');
    expect(params.get('html')).toBe('<p>Hello!</p>');

    expect(result).toEqual({
      id: '<20230101120000.abc@mg.example.com>',
      date: expect.any(String),
    });
  });

  it('should join multiple to/cc/bcc addresses with commas', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: ['a@example.com', 'b@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
      cc: ['cc1@example.com', 'cc2@example.com'],
      bcc: ['bcc@example.com'],
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('to')).toBe('a@example.com,b@example.com');
    expect(params.get('cc')).toBe('cc1@example.com,cc2@example.com');
    expect(params.get('bcc')).toBe('bcc@example.com');
  });

  it('should include h:Reply-To when replyTo is provided', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
      replyTo: 'reply@example.com',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const params = new URLSearchParams(body as string);
    expect(params.get('h:Reply-To')).toBe('reply@example.com');
  });

  it('should use EU base URL when configured', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSuccessResponse());

    const euConnector = new MailgunEmailConnector({
      ...defaultConfig,
      baseUrl: 'https://api.eu.mailgun.net',
    });

    await euConnector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test',
      html: '<p>Test</p>',
    });

    const [url] = mockedAxios.post.mock.calls[0]!;
    expect(url).toBe('https://api.eu.mailgun.net/v3/mg.example.com/messages');
  });

  it('should send multipart body when attachments are present', async () => {
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

    const [, body, config] = mockedAxios.post.mock.calls[0]!;
    const contentType = config?.headers?.['Content-Type'] as string;
    expect(contentType).toContain('multipart/form-data');

    const bodyStr = (body as Buffer).toString();
    expect(bodyStr).toContain('name="from"');
    expect(bodyStr).toContain('name="attachment"; filename="report.pdf"');
    expect(bodyStr).toContain('Content-Type: application/pdf');
  });

  it('should throw ConnectorError on API error', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 401, data: { message: 'Forbidden' } },
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
      expect(connectorErr.providerMessage).toBe('Forbidden');
    }
  });
});
