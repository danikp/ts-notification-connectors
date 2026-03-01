import type { IPushProvider, IPushOptions, ISendMessageSuccessResponse } from '../types';
import { ChannelTypeEnum, PushProviderIdEnum } from '../types';
import { FcmPushConnector } from '../connectors/fcm';
import type { FcmConfig } from '../connectors/fcm';
import { ExpoPushConnector } from '../connectors/expo';
import type { ExpoConfig } from '../connectors/expo';
import { ApnsPushConnector } from '../connectors/apns';
import type { ApnsConfig } from '../connectors/apns';
import { OneSignalPushConnector } from '../connectors/onesignal';
import type { OneSignalConfig } from '../connectors/onesignal';
import { PushoverPushConnector } from '../connectors/pushover';
import type { PushoverConfig } from '../connectors/pushover';
import { PusherBeamsPushConnector } from '../connectors/pusher-beams';
import type { PusherBeamsConfig } from '../connectors/pusher-beams';
import { NtfyPushConnector } from '../connectors/ntfy';
import type { NtfyConfig } from '../connectors/ntfy';
import { PushbulletPushConnector } from '../connectors/pushbullet';
import type { PushbulletConfig } from '../connectors/pushbullet';
import { WonderPushPushConnector } from '../connectors/wonderpush';
import type { WonderPushConfig } from '../connectors/wonderpush';

export class Push implements IPushProvider {
  readonly id: string;
  readonly channelType = ChannelTypeEnum.PUSH;
  private readonly connector: IPushProvider;

  constructor(connector: IPushProvider);
  constructor(providerId: PushProviderIdEnum.FCM, config: FcmConfig);
  constructor(providerId: PushProviderIdEnum.EXPO, config: ExpoConfig);
  constructor(providerId: PushProviderIdEnum.APNS, config: ApnsConfig);
  constructor(providerId: PushProviderIdEnum.OneSignal, config: OneSignalConfig);
  constructor(providerId: PushProviderIdEnum.Pushover, config: PushoverConfig);
  constructor(providerId: PushProviderIdEnum.PusherBeams, config: PusherBeamsConfig);
  constructor(providerId: PushProviderIdEnum.Ntfy, config: NtfyConfig);
  constructor(providerId: PushProviderIdEnum.Pushbullet, config: PushbulletConfig);
  constructor(providerId: PushProviderIdEnum.WonderPush, config: WonderPushConfig);
  constructor(
    providerIdOrConnector: PushProviderIdEnum | IPushProvider,
    config?:
      | FcmConfig
      | ExpoConfig
      | ApnsConfig
      | OneSignalConfig
      | PushoverConfig
      | PusherBeamsConfig
      | NtfyConfig
      | PushbulletConfig
      | WonderPushConfig,
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
      case PushProviderIdEnum.OneSignal:
        this.connector = new OneSignalPushConnector(config as OneSignalConfig);
        break;
      case PushProviderIdEnum.Pushover:
        this.connector = new PushoverPushConnector(config as PushoverConfig);
        break;
      case PushProviderIdEnum.PusherBeams:
        this.connector = new PusherBeamsPushConnector(config as PusherBeamsConfig);
        break;
      case PushProviderIdEnum.Ntfy:
        this.connector = new NtfyPushConnector(config as NtfyConfig);
        break;
      case PushProviderIdEnum.Pushbullet:
        this.connector = new PushbulletPushConnector(config as PushbulletConfig);
        break;
      case PushProviderIdEnum.WonderPush:
        this.connector = new WonderPushPushConnector(config as WonderPushConfig);
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
