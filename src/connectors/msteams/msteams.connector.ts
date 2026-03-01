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
import type { MsTeamsConfig } from './msteams.config';

export class MsTeamsChatConnector
  extends BaseProvider
  implements IChatProvider
{
  id = 'msteams';
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: MsTeamsConfig) {
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
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: options.content,
                wrap: true,
              },
            ],
          },
        },
      ],
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      await axios.post(webhookUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          ...passthroughHeaders,
        },
      });

      return {
        id: undefined,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message:
            typeof error.response?.data === 'string'
              ? error.response.data
              : error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage:
            typeof error.response?.data === 'string'
              ? error.response.data
              : error.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown MS Teams error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
