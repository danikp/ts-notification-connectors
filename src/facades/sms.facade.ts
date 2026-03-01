import type { ISmsProvider, ISmsOptions, ISendMessageSuccessResponse } from '../types';
import { ChannelTypeEnum, SmsProviderIdEnum } from '../types';
import { VonageSmsConnector } from '../connectors/vonage';
import type { VonageConfig } from '../connectors/vonage';
import { TwilioSmsConnector } from '../connectors/twilio';
import type { TwilioConfig } from '../connectors/twilio';
import { PlivoSmsConnector } from '../connectors/plivo';
import type { PlivoConfig } from '../connectors/plivo';
import { SnsSmsConnector } from '../connectors/sns';
import type { SnsConfig } from '../connectors/sns';

export class Sms implements ISmsProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.SMS;
  private readonly connector: ISmsProvider;

  constructor(connector: ISmsProvider);
  constructor(providerId: SmsProviderIdEnum.Nexmo, config: VonageConfig);
  constructor(providerId: SmsProviderIdEnum.Twilio, config: TwilioConfig);
  constructor(providerId: SmsProviderIdEnum.Plivo, config: PlivoConfig);
  constructor(providerId: SmsProviderIdEnum.SNS, config: SnsConfig);
  constructor(
    providerIdOrConnector: SmsProviderIdEnum | ISmsProvider,
    config?: VonageConfig | TwilioConfig | PlivoConfig | SnsConfig,
  ) {
    if (typeof providerIdOrConnector === 'object') {
      this.connector = providerIdOrConnector;
      this.id = providerIdOrConnector.id;
      return;
    }

    this.id = providerIdOrConnector;
    switch (providerIdOrConnector) {
      case SmsProviderIdEnum.Nexmo:
        this.connector = new VonageSmsConnector(config as VonageConfig);
        break;
      case SmsProviderIdEnum.Twilio:
        this.connector = new TwilioSmsConnector(config as TwilioConfig);
        break;
      case SmsProviderIdEnum.Plivo:
        this.connector = new PlivoSmsConnector(config as PlivoConfig);
        break;
      case SmsProviderIdEnum.SNS:
        this.connector = new SnsSmsConnector(config as SnsConfig);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${providerIdOrConnector as string}`);
    }
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData?: Record<string, unknown>,
  ): Promise<ISendMessageSuccessResponse> {
    return this.connector.sendMessage(options, bridgeProviderData);
  }
}
