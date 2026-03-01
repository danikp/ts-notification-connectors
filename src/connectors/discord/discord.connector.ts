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
import type { DiscordConfig } from './discord.config';
import type { DiscordWebhookResponse } from './discord.types';

export class DiscordChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'discord';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: DiscordConfig) {
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
      content: options.content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<DiscordWebhookResponse>(
        `${webhookUrl}?wait=true`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: String(error.response?.data?.code),
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Discord error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
