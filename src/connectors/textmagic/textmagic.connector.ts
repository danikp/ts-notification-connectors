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
import type { TextmagicConfig } from './textmagic.config';
import type { TextmagicSendResponse } from './textmagic.types';

export class TextmagicSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'textmagic';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: TextmagicConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const from = options.from ?? this.config.from;

    const payload: Record<string, unknown> = {
      text: options.content,
      phones: options.to,
      ...(from ? { from } : {}),
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<TextmagicSendResponse>(
        'https://rest.textmagic.com/api/v2/messages',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-TM-Username': this.config.username,
            'X-TM-Key': this.config.apiKey,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: String(response.data.messageId),
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.code,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Textmagic error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
