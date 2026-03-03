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
import { SinchSmsConnector } from '../connectors/sinch';
import type { SinchConfig } from '../connectors/sinch';
import { TelnyxSmsConnector } from '../connectors/telnyx';
import type { TelnyxConfig } from '../connectors/telnyx';
import { InfobipSmsConnector } from '../connectors/infobip';
import type { InfobipConfig } from '../connectors/infobip';
import { MessageBirdSmsConnector } from '../connectors/messagebird';
import type { MessageBirdConfig } from '../connectors/messagebird';
import { TextmagicSmsConnector } from '../connectors/textmagic';
import type { TextmagicConfig } from '../connectors/textmagic';
import { D7NetworksSmsConnector } from '../connectors/d7networks';
import type { D7NetworksConfig } from '../connectors/d7networks';
import { UnicellSmsConnector } from '../connectors/unicell';
import type { UnicellConfig } from '../connectors/unicell';
import { SlngSmsConnector } from '../connectors/slng';
import type { SlngConfig } from '../connectors/slng';
import { UnforuSmsConnector } from '../connectors/unforu';
import type { UnforuConfig } from '../connectors/unforu';
import { CellactSmsConnector } from '../connectors/cellact';
import type { CellactConfig } from '../connectors/cellact';

export class Sms implements ISmsProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.SMS;
  private readonly connector: ISmsProvider;

  constructor(connector: ISmsProvider);
  constructor(providerId: SmsProviderIdEnum.Nexmo, config: VonageConfig);
  constructor(providerId: SmsProviderIdEnum.Twilio, config: TwilioConfig);
  constructor(providerId: SmsProviderIdEnum.Plivo, config: PlivoConfig);
  constructor(providerId: SmsProviderIdEnum.SNS, config: SnsConfig);
  constructor(providerId: SmsProviderIdEnum.Sinch, config: SinchConfig);
  constructor(providerId: SmsProviderIdEnum.Telnyx, config: TelnyxConfig);
  constructor(providerId: SmsProviderIdEnum.Infobip, config: InfobipConfig);
  constructor(providerId: SmsProviderIdEnum.MessageBird, config: MessageBirdConfig);
  constructor(providerId: SmsProviderIdEnum.Textmagic, config: TextmagicConfig);
  constructor(providerId: SmsProviderIdEnum.D7Networks, config: D7NetworksConfig);
  constructor(providerId: SmsProviderIdEnum.Unicell, config: UnicellConfig);
  constructor(providerId: SmsProviderIdEnum.SLNG, config: SlngConfig);
  constructor(providerId: SmsProviderIdEnum.Unforu, config: UnforuConfig);
  constructor(providerId: SmsProviderIdEnum.Cellact, config: CellactConfig);
  constructor(
    providerIdOrConnector: SmsProviderIdEnum | ISmsProvider,
    config?:
      | VonageConfig
      | TwilioConfig
      | PlivoConfig
      | SnsConfig
      | SinchConfig
      | TelnyxConfig
      | InfobipConfig
      | MessageBirdConfig
      | TextmagicConfig
      | D7NetworksConfig
      | UnicellConfig
      | SlngConfig
      | UnforuConfig
      | CellactConfig,
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
      case SmsProviderIdEnum.Sinch:
        this.connector = new SinchSmsConnector(config as SinchConfig);
        break;
      case SmsProviderIdEnum.Telnyx:
        this.connector = new TelnyxSmsConnector(config as TelnyxConfig);
        break;
      case SmsProviderIdEnum.Infobip:
        this.connector = new InfobipSmsConnector(config as InfobipConfig);
        break;
      case SmsProviderIdEnum.MessageBird:
        this.connector = new MessageBirdSmsConnector(config as MessageBirdConfig);
        break;
      case SmsProviderIdEnum.Textmagic:
        this.connector = new TextmagicSmsConnector(config as TextmagicConfig);
        break;
      case SmsProviderIdEnum.D7Networks:
        this.connector = new D7NetworksSmsConnector(config as D7NetworksConfig);
        break;
      case SmsProviderIdEnum.Unicell:
        this.connector = new UnicellSmsConnector(config as UnicellConfig);
        break;
      case SmsProviderIdEnum.SLNG:
        this.connector = new SlngSmsConnector(config as SlngConfig);
        break;
      case SmsProviderIdEnum.Unforu:
        this.connector = new UnforuSmsConnector(config as UnforuConfig);
        break;
      case SmsProviderIdEnum.Cellact:
        this.connector = new CellactSmsConnector(config as CellactConfig);
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
