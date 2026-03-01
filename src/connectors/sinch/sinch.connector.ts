import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  ISmsOptions,
  ISmsProvider,
  ISendMessageSuccessResponse,
  WithPassthrough,
} from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';
import type { SinchConfig } from './sinch.config';
import type { SinchSendResponse } from './sinch.types';

export class SinchSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'sinch';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: SinchConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      from: options.from ?? this.config.from,
      to: [options.to],
      body: options.content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const region = this.config.region ?? 'us';
    const url = `https://${region}.sms.api.sinch.com/xms/v1/${this.config.servicePlanId}/batches`;

    try {
      const response = await axios.post<SinchSendResponse>(
        url,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiToken}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.text ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.code,
          providerMessage: error.response?.data?.text,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Sinch error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
