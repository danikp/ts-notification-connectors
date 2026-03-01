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

export class Email implements IEmailProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.EMAIL;
  private readonly connector: IEmailProvider;

  constructor(connector: IEmailProvider);
  constructor(providerId: EmailProviderIdEnum.SES, config: SesConfig);
  constructor(providerId: EmailProviderIdEnum.Resend, config: ResendConfig);
  constructor(providerId: EmailProviderIdEnum.Mailgun, config: MailgunConfig);
  constructor(
    providerIdOrConnector: EmailProviderIdEnum | IEmailProvider,
    config?: SesConfig | ResendConfig | MailgunConfig,
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
