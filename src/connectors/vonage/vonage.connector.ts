import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  ISmsOptions,
  ISmsProvider,
  ISendMessageSuccessResponse,
  WithPassthrough} from '../../types';
import {
  ChannelTypeEnum
} from '../../types';
import { ConnectorError } from '../../utils';
import type { VonageConfig } from './vonage.config';
import type { VonageSmsResponse } from './vonage.types';

export class VonageSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'nexmo';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: VonageConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      api_key: this.config.apiKey,
      api_secret: this.config.apiSecret,
      to: options.to,
      from: options.from ?? this.config.from,
      text: options.content,
    };

    const { body, headers } = this.transform<Record<string, unknown>>(
      bridgeProviderData,
      payload
    );

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value));
    }

    const response = await axios.post<VonageSmsResponse>(
      'https://rest.nexmo.com/sms/json',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...headers,
        },
      }
    );

    const message = response.data.messages[0]!;

    if (message.status !== '0') {
      throw new ConnectorError({
        message: message['error-text'] ?? 'Unknown Vonage error',
        statusCode: 400,
        providerCode: message.status,
        providerMessage: message['error-text'],
      });
    }

    return {
      id: message['message-id'],
      date: new Date().toISOString(),
    };
  }
}
