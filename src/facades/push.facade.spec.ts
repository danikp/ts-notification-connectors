import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Push } from './push.facade';
import { ChannelTypeEnum, PushProviderIdEnum } from '../types';
import type { IPushProvider, IPushOptions } from '../types';
import { FcmPushConnector } from '../connectors/fcm';
import { ExpoPushConnector } from '../connectors/expo';
import { ApnsPushConnector } from '../connectors/apns';
import { OneSignalPushConnector } from '../connectors/onesignal';
import { PushoverPushConnector } from '../connectors/pushover';
import { PusherBeamsPushConnector } from '../connectors/pusher-beams';
import { NtfyPushConnector } from '../connectors/ntfy';
import { PushbulletPushConnector } from '../connectors/pushbullet';
import { WonderPushPushConnector } from '../connectors/wonderpush';

vi.mock('../connectors/fcm');
vi.mock('../connectors/expo');
vi.mock('../connectors/apns');
vi.mock('../connectors/onesignal');
vi.mock('../connectors/pushover');
vi.mock('../connectors/pusher-beams');
vi.mock('../connectors/ntfy');
vi.mock('../connectors/pushbullet');
vi.mock('../connectors/wonderpush');

const MockedFcm = vi.mocked(FcmPushConnector);
const MockedExpo = vi.mocked(ExpoPushConnector);
const MockedApns = vi.mocked(ApnsPushConnector);
const MockedOneSignal = vi.mocked(OneSignalPushConnector);
const MockedPushover = vi.mocked(PushoverPushConnector);
const MockedPusherBeams = vi.mocked(PusherBeamsPushConnector);
const MockedNtfy = vi.mocked(NtfyPushConnector);
const MockedPushbullet = vi.mocked(PushbulletPushConnector);
const MockedWonderPush = vi.mocked(WonderPushPushConnector);

const pushOptions: IPushOptions = {
  target: ['device-token-1'],
  title: 'Test',
  content: 'Hello',
  payload: {},
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
};

describe('Push facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate FcmPushConnector for FCM provider ID', () => {
    const config = { projectId: 'proj', email: 'sa@example.com', secretKey: 'pem-key' };
    const facade = new Push(PushProviderIdEnum.FCM, config);

    expect(facade.id).toBe('fcm');
    expect(facade.channelType).toBe(ChannelTypeEnum.PUSH);
    expect(MockedFcm).toHaveBeenCalledWith(config);
  });

  it('should instantiate ExpoPushConnector for EXPO provider ID', () => {
    const config = { accessToken: 'expo-token' };
    const facade = new Push(PushProviderIdEnum.EXPO, config);

    expect(facade.id).toBe('expo');
    expect(MockedExpo).toHaveBeenCalledWith(config);
  });

  it('should instantiate ApnsPushConnector for APNS provider ID', () => {
    const config = { key: 'pem', keyId: 'kid', teamId: 'tid', bundleId: 'com.app' };
    const facade = new Push(PushProviderIdEnum.APNS, config);

    expect(facade.id).toBe('apns');
    expect(MockedApns).toHaveBeenCalledWith(config);
  });

  it('should instantiate OneSignalPushConnector for OneSignal provider ID', () => {
    const config = { appId: 'app-uuid', apiKey: 'rest-key' };
    const facade = new Push(PushProviderIdEnum.OneSignal, config);

    expect(facade.id).toBe('one-signal');
    expect(MockedOneSignal).toHaveBeenCalledWith(config);
  });

  it('should instantiate PushoverPushConnector for Pushover provider ID', () => {
    const config = { token: 'pushover-token' };
    const facade = new Push(PushProviderIdEnum.Pushover, config);

    expect(facade.id).toBe('pushover');
    expect(MockedPushover).toHaveBeenCalledWith(config);
  });

  it('should instantiate PusherBeamsPushConnector for PusherBeams provider ID', () => {
    const config = { instanceId: 'inst-id', secretKey: 'secret' };
    const facade = new Push(PushProviderIdEnum.PusherBeams, config);

    expect(facade.id).toBe('pusher-beams');
    expect(MockedPusherBeams).toHaveBeenCalledWith(config);
  });

  it('should instantiate NtfyPushConnector for Ntfy provider ID', () => {
    const config = { token: 'ntfy-token' };
    const facade = new Push(PushProviderIdEnum.Ntfy, config);

    expect(facade.id).toBe('ntfy');
    expect(MockedNtfy).toHaveBeenCalledWith(config);
  });

  it('should instantiate PushbulletPushConnector for Pushbullet provider ID', () => {
    const config = { accessToken: 'pb-token' };
    const facade = new Push(PushProviderIdEnum.Pushbullet, config);

    expect(facade.id).toBe('pushbullet');
    expect(MockedPushbullet).toHaveBeenCalledWith(config);
  });

  it('should instantiate WonderPushPushConnector for WonderPush provider ID', () => {
    const config = { accessToken: 'wp-token' };
    const facade = new Push(PushProviderIdEnum.WonderPush, config);

    expect(facade.id).toBe('wonderpush');
    expect(MockedWonderPush).toHaveBeenCalledWith(config);
  });

  it('should accept a custom IPushProvider connector', () => {
    const custom: IPushProvider = {
      id: 'custom-push',
      channelType: ChannelTypeEnum.PUSH,
      sendMessage: vi.fn().mockResolvedValue({ id: 'custom-123' }),
    };
    const facade = new Push(custom);

    expect(facade.id).toBe('custom-push');
    expect(facade.channelType).toBe(ChannelTypeEnum.PUSH);
  });

  it('should throw for unsupported provider ID', () => {
    expect(() => new Push('unknown' as PushProviderIdEnum, {} as any)).toThrow(
      'Unsupported push provider: unknown',
    );
  });

  it('should delegate sendMessage to the connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'fcm-123' });
    MockedFcm.prototype.sendMessage = sendMock;

    const facade = new Push(PushProviderIdEnum.FCM, { projectId: 'proj', email: 'sa@example.com', secretKey: 'pem-key' });
    const result = await facade.sendMessage(pushOptions);

    expect(sendMock).toHaveBeenCalledWith(pushOptions, undefined);
    expect(result).toEqual({ id: 'fcm-123' });
  });

  it('should delegate sendMessage with bridgeProviderData', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'expo-456' });
    MockedExpo.prototype.sendMessage = sendMock;

    const facade = new Push(PushProviderIdEnum.EXPO, { accessToken: 'expo-token' });
    const bridge = { extra: 'data' };
    const result = await facade.sendMessage(pushOptions, bridge);

    expect(sendMock).toHaveBeenCalledWith(pushOptions, bridge);
    expect(result).toEqual({ id: 'expo-456' });
  });

  it('should delegate sendMessage on a custom connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'custom-789' });
    const custom: IPushProvider = {
      id: 'custom-push',
      channelType: ChannelTypeEnum.PUSH,
      sendMessage: sendMock,
    };
    const facade = new Push(custom);
    const result = await facade.sendMessage(pushOptions);

    expect(sendMock).toHaveBeenCalledWith(pushOptions, undefined);
    expect(result).toEqual({ id: 'custom-789' });
  });
});
