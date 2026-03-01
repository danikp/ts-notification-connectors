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
import type { MessageBirdConfig } from './messagebird.config';
import type { MessageBirdSendResponse } from './messagebird.types';

export class MessageBirdSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'messagebird';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: MessageBirdConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      originator: options.from ?? this.config.from,
      body: options.content,
      recipients: [options.to],
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<MessageBirdSendResponse>(
        'https://rest.messagebird.com/messages',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `AccessKey ${this.config.accessKey}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        const firstError = Array.isArray(errors) ? errors[0] : undefined;
        throw new ConnectorError({
          message: firstError?.description ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: firstError?.code,
          providerMessage: firstError?.description,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown MessageBird error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
