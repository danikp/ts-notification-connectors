import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Email } from './email.facade';
import { ChannelTypeEnum, CheckIntegrationResponseEnum, EmailProviderIdEnum } from '../types';
import type { IEmailProvider, IEmailOptions } from '../types';
import { SesEmailConnector } from '../connectors/ses';
import { ResendEmailConnector } from '../connectors/resend';
import { MailgunEmailConnector } from '../connectors/mailgun';
import { SendgridEmailConnector } from '../connectors/sendgrid';
import { PostmarkEmailConnector } from '../connectors/postmark';
import { MailerSendEmailConnector } from '../connectors/mailersend';
import { MailtrapEmailConnector } from '../connectors/mailtrap';
import { BrevoEmailConnector } from '../connectors/brevo';
import { SparkPostEmailConnector } from '../connectors/sparkpost';

vi.mock('../connectors/ses');
vi.mock('../connectors/resend');
vi.mock('../connectors/mailgun');
vi.mock('../connectors/sendgrid');
vi.mock('../connectors/postmark');
vi.mock('../connectors/mailersend');
vi.mock('../connectors/mailtrap');
vi.mock('../connectors/brevo');
vi.mock('../connectors/sparkpost');

const MockedSes = vi.mocked(SesEmailConnector);
const MockedResend = vi.mocked(ResendEmailConnector);
const MockedMailgun = vi.mocked(MailgunEmailConnector);
const MockedSendgrid = vi.mocked(SendgridEmailConnector);
const MockedPostmark = vi.mocked(PostmarkEmailConnector);
const MockedMailerSend = vi.mocked(MailerSendEmailConnector);
const MockedMailtrap = vi.mocked(MailtrapEmailConnector);
const MockedBrevo = vi.mocked(BrevoEmailConnector);
const MockedSparkPost = vi.mocked(SparkPostEmailConnector);

const emailOptions: IEmailOptions = {
  to: ['test@example.com'],
  subject: 'Test',
  html: '<p>Hello</p>',
};

describe('Email facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate SesEmailConnector for SES provider ID', () => {
    const config = { region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret', from: 'a@b.com', senderName: 'S' };
    const facade = new Email(EmailProviderIdEnum.SES, config);

    expect(facade.id).toBe('ses');
    expect(facade.channelType).toBe(ChannelTypeEnum.EMAIL);
    expect(MockedSes).toHaveBeenCalledWith(config);
  });

  it('should instantiate ResendEmailConnector for Resend provider ID', () => {
    const config = { apiKey: 'key', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.Resend, config);

    expect(facade.id).toBe('resend');
    expect(MockedResend).toHaveBeenCalledWith(config);
  });

  it('should instantiate MailgunEmailConnector for Mailgun provider ID', () => {
    const config = { apiKey: 'key', domain: 'mg.example.com', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.Mailgun, config);

    expect(facade.id).toBe('mailgun');
    expect(MockedMailgun).toHaveBeenCalledWith(config);
  });

  it('should instantiate SendgridEmailConnector for Sendgrid provider ID', () => {
    const config = { apiKey: 'SG.test', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.Sendgrid, config);

    expect(facade.id).toBe('sendgrid');
    expect(MockedSendgrid).toHaveBeenCalledWith(config);
  });

  it('should instantiate PostmarkEmailConnector for Postmark provider ID', () => {
    const config = { serverToken: 'pm-test', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.Postmark, config);

    expect(facade.id).toBe('postmark');
    expect(MockedPostmark).toHaveBeenCalledWith(config);
  });

  it('should instantiate MailerSendEmailConnector for MailerSend provider ID', () => {
    const config = { apiToken: 'token', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.MailerSend, config);

    expect(facade.id).toBe('mailersend');
    expect(MockedMailerSend).toHaveBeenCalledWith(config);
  });

  it('should instantiate MailtrapEmailConnector for Mailtrap provider ID', () => {
    const config = { apiToken: 'token', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.Mailtrap, config);

    expect(facade.id).toBe('mailtrap');
    expect(MockedMailtrap).toHaveBeenCalledWith(config);
  });

  it('should instantiate BrevoEmailConnector for Brevo provider ID', () => {
    const config = { apiKey: 'key', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.Brevo, config);

    expect(facade.id).toBe('brevo');
    expect(MockedBrevo).toHaveBeenCalledWith(config);
  });

  it('should instantiate SparkPostEmailConnector for SparkPost provider ID', () => {
    const config = { apiKey: 'key', from: 'a@b.com' };
    const facade = new Email(EmailProviderIdEnum.SparkPost, config);

    expect(facade.id).toBe('sparkpost');
    expect(MockedSparkPost).toHaveBeenCalledWith(config);
  });

  it('should accept a custom IEmailProvider connector', () => {
    const custom: IEmailProvider = {
      id: 'custom-email',
      channelType: ChannelTypeEnum.EMAIL,
      sendMessage: vi.fn().mockResolvedValue({ id: 'custom-123' }),
    };
    const facade = new Email(custom);

    expect(facade.id).toBe('custom-email');
    expect(facade.channelType).toBe(ChannelTypeEnum.EMAIL);
  });

  it('should throw for unsupported provider ID', () => {
    expect(() => new Email('unknown' as EmailProviderIdEnum, {} as any)).toThrow(
      'Unsupported email provider: unknown',
    );
  });

  it('should delegate sendMessage to the connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'ses-123' });
    MockedSes.prototype.sendMessage = sendMock;

    const facade = new Email(EmailProviderIdEnum.SES, {
      region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret', from: 'a@b.com', senderName: 'S',
    });
    const result = await facade.sendMessage(emailOptions);

    expect(sendMock).toHaveBeenCalledWith(emailOptions, undefined);
    expect(result).toEqual({ id: 'ses-123' });
  });

  it('should delegate sendMessage with bridgeProviderData', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'ses-456' });
    MockedSes.prototype.sendMessage = sendMock;

    const facade = new Email(EmailProviderIdEnum.SES, {
      region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret', from: 'a@b.com', senderName: 'S',
    });
    const bridge = { extra: 'data' };
    const result = await facade.sendMessage(emailOptions, bridge);

    expect(sendMock).toHaveBeenCalledWith(emailOptions, bridge);
    expect(result).toEqual({ id: 'ses-456' });
  });

  it('should delegate checkIntegration when connector implements it', async () => {
    const checkMock = vi.fn().mockResolvedValue({
      success: true,
      message: 'OK',
      code: CheckIntegrationResponseEnum.SUCCESS,
    });
    MockedSes.prototype.checkIntegration = checkMock;

    const facade = new Email(EmailProviderIdEnum.SES, {
      region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret', from: 'a@b.com', senderName: 'S',
    });
    const result = await facade.checkIntegration(emailOptions);

    expect(checkMock).toHaveBeenCalledWith(emailOptions);
    expect(result).toEqual({ success: true, message: 'OK', code: CheckIntegrationResponseEnum.SUCCESS });
  });

  it('should return success fallback when connector does not implement checkIntegration', async () => {
    MockedSes.prototype.checkIntegration = undefined;

    const facade = new Email(EmailProviderIdEnum.SES, {
      region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret', from: 'a@b.com', senderName: 'S',
    });
    const result = await facade.checkIntegration(emailOptions);

    expect(result).toEqual({
      success: true,
      message: 'checkIntegration not implemented',
      code: CheckIntegrationResponseEnum.SUCCESS,
    });
  });

  it('should delegate sendMessage on a custom connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'custom-789' });
    const custom: IEmailProvider = {
      id: 'custom-email',
      channelType: ChannelTypeEnum.EMAIL,
      sendMessage: sendMock,
    };
    const facade = new Email(custom);
    const result = await facade.sendMessage(emailOptions);

    expect(sendMock).toHaveBeenCalledWith(emailOptions, undefined);
    expect(result).toEqual({ id: 'custom-789' });
  });
});
