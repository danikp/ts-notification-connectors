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
import type { InfobipConfig } from './infobip.config';
import type { InfobipSendResponse } from './infobip.types';

export class InfobipSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'infobip';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: InfobipConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      messages: [
        {
          from: options.from ?? this.config.from,
          destinations: [{ to: options.to }],
          text: options.content,
        },
      ],
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const url = `https://${this.config.baseUrl}/sms/3/messages`;

    try {
      const response = await axios.post<InfobipSendResponse>(
        url,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `App ${this.config.apiKey}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.messages[0]!.messageId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.requestError?.serviceException?.text ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.requestError?.serviceException?.messageId,
          providerMessage: error.response?.data?.requestError?.serviceException?.text,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Infobip error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
