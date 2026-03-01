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
import type { GoogleChatConfig } from './google-chat.config';
import type { GoogleChatSendResponse } from './google-chat.types';

export class GoogleChatChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'google-chat';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: GoogleChatConfig) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const webhookUrl = options.webhookUrl ?? this.config.webhookUrl;

    if (!webhookUrl) {
      throw new ConnectorError({
        message:
          'Missing webhook URL: provide webhookUrl in options or config',
        statusCode: 400,
      });
    }

    const payload: Record<string, unknown> = {
      text: options.content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<GoogleChatSendResponse>(
        webhookUrl,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.name,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.error?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.error?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Google Chat error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
