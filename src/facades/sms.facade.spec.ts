import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sms } from './sms.facade';
import { ChannelTypeEnum, SmsProviderIdEnum } from '../types';
import type { ISmsProvider, ISmsOptions } from '../types';
import { VonageSmsConnector } from '../connectors/vonage';
import { TwilioSmsConnector } from '../connectors/twilio';
import { PlivoSmsConnector } from '../connectors/plivo';
import { SnsSmsConnector } from '../connectors/sns';
import { SinchSmsConnector } from '../connectors/sinch';
import { TelnyxSmsConnector } from '../connectors/telnyx';
import { InfobipSmsConnector } from '../connectors/infobip';
import { MessageBirdSmsConnector } from '../connectors/messagebird';
import { TextmagicSmsConnector } from '../connectors/textmagic';
import { D7NetworksSmsConnector } from '../connectors/d7networks';

vi.mock('../connectors/vonage');
vi.mock('../connectors/twilio');
vi.mock('../connectors/plivo');
vi.mock('../connectors/sns');
vi.mock('../connectors/sinch');
vi.mock('../connectors/telnyx');
vi.mock('../connectors/infobip');
vi.mock('../connectors/messagebird');
vi.mock('../connectors/textmagic');
vi.mock('../connectors/d7networks');

const MockedVonage = vi.mocked(VonageSmsConnector);
const MockedTwilio = vi.mocked(TwilioSmsConnector);
const MockedPlivo = vi.mocked(PlivoSmsConnector);
const MockedSns = vi.mocked(SnsSmsConnector);
const MockedSinch = vi.mocked(SinchSmsConnector);
const MockedTelnyx = vi.mocked(TelnyxSmsConnector);
const MockedInfobip = vi.mocked(InfobipSmsConnector);
const MockedMessageBird = vi.mocked(MessageBirdSmsConnector);
const MockedTextmagic = vi.mocked(TextmagicSmsConnector);
const MockedD7Networks = vi.mocked(D7NetworksSmsConnector);

const smsOptions: ISmsOptions = {
  to: '+1234567890',
  content: 'Hello',
};

describe('Sms facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate VonageSmsConnector for Nexmo provider ID', () => {
    const config = { apiKey: 'key', apiSecret: 'secret', from: '+10000000000' };
    const facade = new Sms(SmsProviderIdEnum.Nexmo, config);

    expect(facade.id).toBe('nexmo');
    expect(facade.channelType).toBe(ChannelTypeEnum.SMS);
    expect(MockedVonage).toHaveBeenCalledWith(config);
  });

  it('should instantiate TwilioSmsConnector for Twilio provider ID', () => {
    const config = { accountSid: 'sid', authToken: 'token', from: '+10000000000' };
    const facade = new Sms(SmsProviderIdEnum.Twilio, config);

    expect(facade.id).toBe('twilio');
    expect(MockedTwilio).toHaveBeenCalledWith(config);
  });

  it('should instantiate PlivoSmsConnector for Plivo provider ID', () => {
    const config = { authId: 'id', authToken: 'token', from: '+10000000000' };
    const facade = new Sms(SmsProviderIdEnum.Plivo, config);

    expect(facade.id).toBe('plivo');
    expect(MockedPlivo).toHaveBeenCalledWith(config);
  });

  it('should instantiate SnsSmsConnector for SNS provider ID', () => {
    const config = { region: 'us-east-1', accessKeyId: 'key', secretAccessKey: 'secret' };
    const facade = new Sms(SmsProviderIdEnum.SNS, config);

    expect(facade.id).toBe('sns');
    expect(MockedSns).toHaveBeenCalledWith(config);
  });

  it('should instantiate SinchSmsConnector for Sinch provider ID', () => {
    const config = { servicePlanId: 'plan', apiToken: 'token', from: '+10000000000' };
    const facade = new Sms(SmsProviderIdEnum.Sinch, config);

    expect(facade.id).toBe('sinch');
    expect(MockedSinch).toHaveBeenCalledWith(config);
  });

  it('should instantiate TelnyxSmsConnector for Telnyx provider ID', () => {
    const config = { apiKey: 'KEY_test', from: '+10000000000' };
    const facade = new Sms(SmsProviderIdEnum.Telnyx, config);

    expect(facade.id).toBe('telnyx');
    expect(MockedTelnyx).toHaveBeenCalledWith(config);
  });

  it('should instantiate InfobipSmsConnector for Infobip provider ID', () => {
    const config = { apiKey: 'key', baseUrl: 'api.infobip.com', from: 'InfoSMS' };
    const facade = new Sms(SmsProviderIdEnum.Infobip, config);

    expect(facade.id).toBe('infobip');
    expect(MockedInfobip).toHaveBeenCalledWith(config);
  });

  it('should instantiate MessageBirdSmsConnector for MessageBird provider ID', () => {
    const config = { accessKey: 'key', from: 'MsgBird' };
    const facade = new Sms(SmsProviderIdEnum.MessageBird, config);

    expect(facade.id).toBe('messagebird');
    expect(MockedMessageBird).toHaveBeenCalledWith(config);
  });

  it('should instantiate TextmagicSmsConnector for Textmagic provider ID', () => {
    const config = { username: 'user', apiKey: 'key' };
    const facade = new Sms(SmsProviderIdEnum.Textmagic, config);

    expect(facade.id).toBe('textmagic');
    expect(MockedTextmagic).toHaveBeenCalledWith(config);
  });

  it('should instantiate D7NetworksSmsConnector for D7Networks provider ID', () => {
    const config = { apiToken: 'token', from: 'D7' };
    const facade = new Sms(SmsProviderIdEnum.D7Networks, config);

    expect(facade.id).toBe('d7networks');
    expect(MockedD7Networks).toHaveBeenCalledWith(config);
  });

  it('should accept a custom ISmsProvider connector', () => {
    const custom: ISmsProvider = {
      id: 'custom-sms',
      channelType: ChannelTypeEnum.SMS,
      sendMessage: vi.fn().mockResolvedValue({ id: 'custom-123' }),
    };
    const facade = new Sms(custom);

    expect(facade.id).toBe('custom-sms');
    expect(facade.channelType).toBe(ChannelTypeEnum.SMS);
  });

  it('should throw for unsupported provider ID', () => {
    expect(() => new Sms('unknown' as SmsProviderIdEnum, {} as any)).toThrow(
      'Unsupported SMS provider: unknown',
    );
  });

  it('should delegate sendMessage to the connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'vonage-123' });
    MockedVonage.prototype.sendMessage = sendMock;

    const facade = new Sms(SmsProviderIdEnum.Nexmo, { apiKey: 'key', apiSecret: 'secret', from: '+10000000000' });
    const result = await facade.sendMessage(smsOptions);

    expect(sendMock).toHaveBeenCalledWith(smsOptions, undefined);
    expect(result).toEqual({ id: 'vonage-123' });
  });

  it('should delegate sendMessage with bridgeProviderData', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'twilio-456' });
    MockedTwilio.prototype.sendMessage = sendMock;

    const facade = new Sms(SmsProviderIdEnum.Twilio, { accountSid: 'sid', authToken: 'token', from: '+10000000000' });
    const bridge = { extra: 'data' };
    const result = await facade.sendMessage(smsOptions, bridge);

    expect(sendMock).toHaveBeenCalledWith(smsOptions, bridge);
    expect(result).toEqual({ id: 'twilio-456' });
  });

  it('should delegate sendMessage on a custom connector', async () => {
    const sendMock = vi.fn().mockResolvedValue({ id: 'custom-789' });
    const custom: ISmsProvider = {
      id: 'custom-sms',
      channelType: ChannelTypeEnum.SMS,
      sendMessage: sendMock,
    };
    const facade = new Sms(custom);
    const result = await facade.sendMessage(smsOptions);

    expect(sendMock).toHaveBeenCalledWith(smsOptions, undefined);
    expect(result).toEqual({ id: 'custom-789' });
  });
});
