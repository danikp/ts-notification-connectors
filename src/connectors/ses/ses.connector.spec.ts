import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import aws4 from 'aws4';
import { SesEmailConnector } from './ses.connector';
import type { SesConfig } from './ses.config';
import { ChannelTypeEnum, CheckIntegrationResponseEnum } from '../../types';
import { ConnectorError } from '../../utils';

vi.mock('axios');
vi.mock('aws4');
const mockedAxios = vi.mocked(axios, true);
const mockedAws4 = vi.mocked(aws4, true);

const defaultConfig: SesConfig = {
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  from: 'sender@example.com',
  senderName: 'Test Sender',
};

function buildSesSuccessResponse() {
  return {
    data: { MessageId: 'ses-msg-123' },
  };
}

describe('SesEmailConnector', () => {
  let connector: SesEmailConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new SesEmailConnector(defaultConfig);

    // Default aws4.sign mock: adds Authorization header and returns the request
    mockedAws4.sign.mockImplementation((req) => {
      (req.headers as any).Authorization = 'AWS4-HMAC-SHA256 ...';
      return req as any;
    });
  });

  it('should have id "ses" and channelType EMAIL', () => {
    expect(connector.id).toBe('ses');
    expect(connector.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should send a simple message (no attachments) with correct URL, JSON body using Content.Simple, and return { id, date }', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    const result = await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      html: '<p>Hello!</p>',
      text: 'Hello!',
    });

    expect(mockedAxios.post).toHaveBeenCalledOnce();

    const [url, body, config] = mockedAxios.post.mock.calls[0]!;

    // Verify URL
    expect(url).toBe(
      'https://email.us-east-1.amazonaws.com/v2/email/outbound-emails'
    );

    // Body is a serialized JSON string
    const parsedBody = JSON.parse(body as string);

    // Verify Content.Simple structure
    expect(parsedBody.Content).toHaveProperty('Simple');
    expect(parsedBody.Content.Simple.Subject).toEqual({
      Data: 'Test Subject',
      Charset: 'UTF-8',
    });
    expect(parsedBody.Content.Simple.Body.Html).toEqual({
      Data: '<p>Hello!</p>',
      Charset: 'UTF-8',
    });
    expect(parsedBody.Content.Simple.Body.Text).toEqual({
      Data: 'Hello!',
      Charset: 'UTF-8',
    });

    // Verify FromEmailAddress
    expect(parsedBody.FromEmailAddress).toBe(
      'Test Sender <sender@example.com>'
    );

    // Verify Destination
    expect(parsedBody.Destination.ToAddresses).toEqual([
      'recipient@example.com',
    ]);

    // Verify aws4.sign was called with correct service/region
    expect(mockedAws4.sign).toHaveBeenCalledOnce();
    const signArgs = mockedAws4.sign.mock.calls[0]!;
    expect(signArgs[0]).toEqual(
      expect.objectContaining({
        service: 'ses',
        region: 'us-east-1',
        method: 'POST',
        path: '/v2/email/outbound-emails',
      })
    );
    expect(signArgs[1]).toEqual({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    });

    // Verify headers include Authorization from signed request
    expect(config?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'AWS4-HMAC-SHA256 ...',
      })
    );

    // Verify response shape
    expect(result).toEqual({
      id: 'ses-msg-123',
      date: expect.any(String),
    });

    // Verify date is a valid ISO string
    expect(() => new Date(result.date!)).not.toThrow();
  });

  it('should include CcAddresses, BccAddresses, and ReplyToAddresses when cc, bcc, and replyTo are provided', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'CC/BCC Test',
      html: '<p>Test</p>',
      cc: ['cc1@example.com', 'cc2@example.com'],
      bcc: ['bcc@example.com'],
      replyTo: 'reply@example.com',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = JSON.parse(body as string);

    expect(parsedBody.Destination.CcAddresses).toEqual([
      'cc1@example.com',
      'cc2@example.com',
    ]);
    expect(parsedBody.Destination.BccAddresses).toEqual(['bcc@example.com']);
    expect(parsedBody.ReplyToAddresses).toEqual(['reply@example.com']);
  });

  it('should use Content.Raw.Data (base64 encoded MIME) when attachments are provided', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    const fileBuffer = Buffer.from('file-content-here');

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Attachment Test',
      html: '<p>See attached</p>',
      attachments: [
        {
          mime: 'application/pdf',
          file: fileBuffer,
          name: 'report.pdf',
        },
      ],
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = JSON.parse(body as string);

    // Should use Raw, not Simple
    expect(parsedBody.Content).toHaveProperty('Raw');
    expect(parsedBody.Content).not.toHaveProperty('Simple');

    // Raw.Data should be a base64-encoded string
    expect(typeof parsedBody.Content.Raw.Data).toBe('string');

    // Decode and verify it contains MIME structure
    const decoded = Buffer.from(parsedBody.Content.Raw.Data, 'base64').toString(
      'utf-8'
    );
    expect(decoded).toContain('MIME-Version: 1.0');
    expect(decoded).toContain('Content-Type: multipart/mixed');
    expect(decoded).toContain('Content-Type: application/pdf; name="report.pdf"');
    expect(decoded).toContain('Content-Transfer-Encoding: base64');
    expect(decoded).toContain(fileBuffer.toString('base64'));
  });

  it('should merge bridgeProviderData passthrough body into the request', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    await connector.sendMessage(
      {
        to: ['recipient@example.com'],
        subject: 'Passthrough Test',
        html: '<p>Test</p>',
      },
      {
        _passthrough: {
          body: {
            FeedbackForwardingEmailAddress: 'feedback@example.com',
          },
        },
      }
    );

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = JSON.parse(body as string);

    // Passthrough body should be merged into the request
    expect(parsedBody.FeedbackForwardingEmailAddress).toBe(
      'feedback@example.com'
    );

    // Original fields should still be present
    expect(parsedBody.FromEmailAddress).toBe(
      'Test Sender <sender@example.com>'
    );
    expect(parsedBody.Destination.ToAddresses).toEqual([
      'recipient@example.com',
    ]);
  });

  it('should throw ConnectorError with correct fields when axios throws an AxiosError', async () => {
    const axiosError = new AxiosError('Request failed', '400');
    (axiosError as any).response = {
      status: 401,
      data: {
        Code: 'InvalidClientTokenId',
        message: 'Invalid credentials',
      },
      statusText: 'Unauthorized',
      headers: {},
      config: {} as any,
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    try {
      await connector.sendMessage({
        to: ['recipient@example.com'],
        subject: 'Error Test',
        html: '<p>Test</p>',
      });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectorError);
      const connectorErr = err as ConnectorError;
      expect(connectorErr.message).toBe('Invalid credentials');
      expect(connectorErr.statusCode).toBe(401);
      expect(connectorErr.providerCode).toBe('InvalidClientTokenId');
      expect(connectorErr.providerMessage).toBe('Invalid credentials');
    }
  });

  it('should return { success: true, code: SUCCESS } from checkIntegration on success', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    const result = await connector.checkIntegration({
      to: ['recipient@example.com'],
      subject: 'Integration Check',
      html: '<p>Test</p>',
    });

    expect(result).toEqual({
      success: true,
      message: 'Integration successful',
      code: CheckIntegrationResponseEnum.SUCCESS,
    });
  });

  it('should return { success: false, code: BAD_CREDENTIALS } from checkIntegration on 401 error', async () => {
    const axiosError = new AxiosError('Request failed', '400');
    (axiosError as any).response = {
      status: 401,
      data: {
        Code: 'InvalidClientTokenId',
        message: 'Invalid credentials',
      },
      statusText: 'Unauthorized',
      headers: {},
      config: {} as any,
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const result = await connector.checkIntegration({
      to: ['recipient@example.com'],
      subject: 'Integration Check',
      html: '<p>Test</p>',
    });

    expect(result).toEqual({
      success: false,
      message: 'Invalid credentials',
      code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
    });
  });

  it('should include ConfigurationSetName in request body when set in config', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    const configWithSet: SesConfig = {
      ...defaultConfig,
      configurationSetName: 'my-config-set',
    };
    const connectorWithSet = new SesEmailConnector(configWithSet);

    await connectorWithSet.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Config Set Test',
      html: '<p>Test</p>',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = JSON.parse(body as string);

    expect(parsedBody.ConfigurationSetName).toBe('my-config-set');
  });

  it('should use senderName from options when it overrides the config default', async () => {
    mockedAxios.post.mockResolvedValueOnce(buildSesSuccessResponse());

    await connector.sendMessage({
      to: ['recipient@example.com'],
      subject: 'Sender Name Override Test',
      html: '<p>Test</p>',
      senderName: 'Override Sender',
    });

    const [, body] = mockedAxios.post.mock.calls[0]!;
    const parsedBody = JSON.parse(body as string);

    expect(parsedBody.FromEmailAddress).toBe(
      'Override Sender <sender@example.com>'
    );
  });
});
