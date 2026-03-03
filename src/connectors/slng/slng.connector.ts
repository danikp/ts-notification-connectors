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
import type { SlngConfig } from './slng.config';
import type { SlngSendResponse } from './slng.types';

export class SlngSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'slng';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.PASCAL_CASE;

  constructor(private config: SlngConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      Username: this.config.username,
      Password: this.config.password,
      MsgName: 'SMS',
      MsgBody: options.content,
      FromMobile: options.from ?? this.config.from,
      Mobiles: [{ Mobile: options.to }],
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const encodedBody = encodeURIComponent(JSON.stringify(body));

    try {
      const response = await axios.post<SlngSendResponse>(
        'https://slng5.com/Api/SendSmsJsonBody.ashx',
        encodedBody,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...passthroughHeaders,
          },
        }
      );

      if (!response.data.Status) {
        throw new ConnectorError({
          message: response.data.Description ?? 'SLNG API error',
          statusCode: 200,
          providerMessage: response.data.Description,
        });
      }

      return {
        id: response.data.GeneralGUID,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.Description ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.Description,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown SLNG error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
