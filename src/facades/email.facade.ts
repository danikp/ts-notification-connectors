import type {
  IEmailProvider,
  IEmailOptions,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
} from '../types';
import { ChannelTypeEnum, CheckIntegrationResponseEnum, EmailProviderIdEnum } from '../types';
import { SesEmailConnector } from '../connectors/ses';
import type { SesConfig } from '../connectors/ses';
import { ResendEmailConnector } from '../connectors/resend';
import type { ResendConfig } from '../connectors/resend';
import { MailgunEmailConnector } from '../connectors/mailgun';
import type { MailgunConfig } from '../connectors/mailgun';
import { SendgridEmailConnector } from '../connectors/sendgrid';
import type { SendgridConfig } from '../connectors/sendgrid';
import { PostmarkEmailConnector } from '../connectors/postmark';
import type { PostmarkConfig } from '../connectors/postmark';
import { MailerSendEmailConnector } from '../connectors/mailersend';
import type { MailerSendConfig } from '../connectors/mailersend';
import { MailtrapEmailConnector } from '../connectors/mailtrap';
import type { MailtrapConfig } from '../connectors/mailtrap';
import { BrevoEmailConnector } from '../connectors/brevo';
import type { BrevoConfig } from '../connectors/brevo';
import { SparkPostEmailConnector } from '../connectors/sparkpost';
import type { SparkPostConfig } from '../connectors/sparkpost';

export class Email implements IEmailProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.EMAIL;
  private readonly connector: IEmailProvider;

  constructor(connector: IEmailProvider);
  constructor(providerId: EmailProviderIdEnum.SES, config: SesConfig);
  constructor(providerId: EmailProviderIdEnum.Resend, config: ResendConfig);
  constructor(providerId: EmailProviderIdEnum.Mailgun, config: MailgunConfig);
  constructor(providerId: EmailProviderIdEnum.Sendgrid, config: SendgridConfig);
  constructor(providerId: EmailProviderIdEnum.Postmark, config: PostmarkConfig);
  constructor(providerId: EmailProviderIdEnum.MailerSend, config: MailerSendConfig);
  constructor(providerId: EmailProviderIdEnum.Mailtrap, config: MailtrapConfig);
  constructor(providerId: EmailProviderIdEnum.Brevo, config: BrevoConfig);
  constructor(providerId: EmailProviderIdEnum.SparkPost, config: SparkPostConfig);
  constructor(
    providerIdOrConnector: EmailProviderIdEnum | IEmailProvider,
    config?:
      | SesConfig
      | ResendConfig
      | MailgunConfig
      | SendgridConfig
      | PostmarkConfig
      | MailerSendConfig
      | MailtrapConfig
      | BrevoConfig
      | SparkPostConfig,
  ) {
    if (typeof providerIdOrConnector === 'object') {
      this.connector = providerIdOrConnector;
      this.id = providerIdOrConnector.id;
      return;
    }

    this.id = providerIdOrConnector;
    switch (providerIdOrConnector) {
      case EmailProviderIdEnum.SES:
        this.connector = new SesEmailConnector(config as SesConfig);
        break;
      case EmailProviderIdEnum.Resend:
        this.connector = new ResendEmailConnector(config as ResendConfig);
        break;
      case EmailProviderIdEnum.Mailgun:
        this.connector = new MailgunEmailConnector(config as MailgunConfig);
        break;
      case EmailProviderIdEnum.Sendgrid:
        this.connector = new SendgridEmailConnector(config as SendgridConfig);
        break;
      case EmailProviderIdEnum.Postmark:
        this.connector = new PostmarkEmailConnector(config as PostmarkConfig);
        break;
      case EmailProviderIdEnum.MailerSend:
        this.connector = new MailerSendEmailConnector(config as MailerSendConfig);
        break;
      case EmailProviderIdEnum.Mailtrap:
        this.connector = new MailtrapEmailConnector(config as MailtrapConfig);
        break;
      case EmailProviderIdEnum.Brevo:
        this.connector = new BrevoEmailConnector(config as BrevoConfig);
        break;
      case EmailProviderIdEnum.SparkPost:
        this.connector = new SparkPostEmailConnector(config as SparkPostConfig);
        break;
      default:
        throw new Error(`Unsupported email provider: ${providerIdOrConnector as string}`);
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData?: Record<string, unknown>,
  ): Promise<ISendMessageSuccessResponse> {
    return this.connector.sendMessage(options, bridgeProviderData);
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    if (!this.connector.checkIntegration) {
      return {
        success: true,
        message: 'checkIntegration not implemented',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    }
    return this.connector.checkIntegration(options);
  }
}
