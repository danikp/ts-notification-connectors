import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  WithPassthrough,
} from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';
import type { LineConfig } from './line.config';
import type { LineSendResponse } from './line.types';

export class LineChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'line';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: LineConfig) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      to: options.channel,
      messages: [{ type: 'text', text: options.content }],
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<LineSendResponse>(
        'https://api.line.me/v2/bot/message/push',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.channelAccessToken}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.sentMessages[0]!.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown LINE error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
