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
import type { RocketChatConfig } from './rocketchat.config';
import type { RocketChatSendResponse } from './rocketchat.types';

export class RocketChatChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'rocketchat';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: RocketChatConfig) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      message: {
        rid: options.channel ?? this.config.roomId,
        msg: options.content,
      },
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<RocketChatSendResponse>(
        `${this.config.serverUrl}/api/v1/chat.sendMessage`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.config.authToken,
            'X-User-Id': this.config.userId,
            ...passthroughHeaders,
          },
        }
      );

      if (!response.data.success) {
        throw new ConnectorError({
          message: 'Rocket.Chat API returned success: false',
          statusCode: 500,
        });
      }

      return {
        id: response.data.message._id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.error ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.error,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Rocket.Chat error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
