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
import type { TelnyxConfig } from './telnyx.config';
import type { TelnyxSendResponse } from './telnyx.types';

export class TelnyxSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'telnyx';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: TelnyxConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      from: options.from ?? this.config.from,
      to: options.to,
      text: options.content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<TelnyxSendResponse>(
        'https://api.telnyx.com/v2/messages',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.data.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        const firstError = Array.isArray(errors) ? errors[0] : undefined;
        throw new ConnectorError({
          message: firstError?.detail ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: firstError?.code,
          providerMessage: firstError?.detail,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Telnyx error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
