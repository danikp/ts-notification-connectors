import type { IPushProvider, IPushOptions, ISendMessageSuccessResponse } from '../types';
import { ChannelTypeEnum, PushProviderIdEnum } from '../types';
import { FcmPushConnector } from '../connectors/fcm';
import type { FcmConfig } from '../connectors/fcm';
import { ExpoPushConnector } from '../connectors/expo';
import type { ExpoConfig } from '../connectors/expo';
import { ApnsPushConnector } from '../connectors/apns';
import type { ApnsConfig } from '../connectors/apns';

export class Push implements IPushProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.PUSH;
  private readonly connector: IPushProvider;

  constructor(connector: IPushProvider);
  constructor(providerId: PushProviderIdEnum.FCM, config: FcmConfig);
  constructor(providerId: PushProviderIdEnum.EXPO, config: ExpoConfig);
  constructor(providerId: PushProviderIdEnum.APNS, config: ApnsConfig);
  constructor(
    providerIdOrConnector: PushProviderIdEnum | IPushProvider,
    config?: FcmConfig | ExpoConfig | ApnsConfig,
  ) {
    if (typeof providerIdOrConnector === 'object') {
      this.connector = providerIdOrConnector;
      this.id = providerIdOrConnector.id;
      return;
    }

    this.id = providerIdOrConnector;
    switch (providerIdOrConnector) {
      case PushProviderIdEnum.FCM:
        this.connector = new FcmPushConnector(config as FcmConfig);
        break;
      case PushProviderIdEnum.EXPO:
        this.connector = new ExpoPushConnector(config as ExpoConfig);
        break;
      case PushProviderIdEnum.APNS:
        this.connector = new ApnsPushConnector(config as ApnsConfig);
        break;
      default:
        throw new Error(`Unsupported push provider: ${providerIdOrConnector as string}`);
    }
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData?: Record<string, unknown>,
  ): Promise<ISendMessageSuccessResponse> {
    return this.connector.sendMessage(options, bridgeProviderData);
  }
}
