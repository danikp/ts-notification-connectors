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
import type { PlivoConfig } from './plivo.config';
import type { PlivoMessageResponse } from './plivo.types';

export class PlivoSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'plivo';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: PlivoConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      src: options.from ?? this.config.from,
      dst: options.to,
      text: options.content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const auth = Buffer.from(
      `${this.config.authId}:${this.config.authToken}`
    ).toString('base64');

    try {
      const response = await axios.post<PlivoMessageResponse>(
        `https://api.plivo.com/v1/Account/${this.config.authId}/Message/`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.message_uuid[0],
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.error ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.api_id,
          providerMessage: error.response?.data?.error,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Plivo error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
