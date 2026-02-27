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
import type { TelegramConfig } from './telegram.config';
import type { TelegramResponse } from './telegram.types';

export class TelegramChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'telegram';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: TelegramConfig) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      chat_id: options.channel,
      text: options.content,
      parse_mode: 'HTML',
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    let response;
    try {
      response = await axios.post<TelegramResponse>(
        `https://api.telegram.org/bot${this.config.botToken}/sendMessage`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...passthroughHeaders,
          },
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.description ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: String(error.response?.data?.error_code),
          providerMessage: error.response?.data?.description,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Telegram error',
        statusCode: 500,
        cause: error as Error,
      });
    }

    if (!response.data.ok) {
      throw new ConnectorError({
        message: response.data.description ?? 'Telegram API error',
        statusCode: response.data.error_code ?? 500,
        providerCode: String(response.data.error_code),
        providerMessage: response.data.description,
      });
    }

    return {
      id: String(response.data.result!.message_id),
      date: new Date().toISOString(),
    };
  }
}
