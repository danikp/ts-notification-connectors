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
import type { WhatsAppConfig } from './whatsapp.config';
import type { WhatsAppResponse } from './whatsapp.types';

export class WhatsAppChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'whatsapp-business';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: WhatsAppConfig) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: options.channel,
      type: 'text',
      text: { body: options.content },
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<WhatsAppResponse>(
        `https://graph.facebook.com/v21.0/${this.config.phoneNumberId}/messages`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.accessToken}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.messages[0]!.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.error?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: String(error.response?.data?.error?.code),
          providerMessage: error.response?.data?.error?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown WhatsApp error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
