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
import type { D7NetworksConfig } from './d7networks.config';
import type { D7NetworksSendResponse } from './d7networks.types';

export class D7NetworksSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'd7networks';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: D7NetworksConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      messages: [
        {
          channel: 'sms',
          recipients: [options.to],
          content: options.content,
          msg_type: 'text',
        },
      ],
      message_globals: {
        originator: options.from ?? this.config.from,
      },
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<D7NetworksSendResponse>(
        'https://api.d7networks.com/messages/v1/send',
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
        id: response.data.request_id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.detail ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.code,
          providerMessage: error.response?.data?.detail,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown D7Networks error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
