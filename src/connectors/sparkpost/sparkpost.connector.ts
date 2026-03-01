import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  WithPassthrough,
} from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';
import type { SparkPostConfig } from './sparkpost.config';
import type { SparkPostSendResponse } from './sparkpost.types';

export class SparkPostEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'sparkpost';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: SparkPostConfig) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName ?? this.config.senderName;
    const from = options.from ?? this.config.from;

    const recipients = options.to.map((email) => ({
      address: { email },
    }));

    if (options.cc && options.cc.length > 0) {
      for (const email of options.cc) {
        recipients.push({ address: { email } });
      }
    }
    if (options.bcc && options.bcc.length > 0) {
      for (const email of options.bcc) {
        recipients.push({ address: { email } });
      }
    }

    const content: Record<string, unknown> = {
      from: senderName
        ? { email: from, name: senderName }
        : { email: from },
      subject: options.subject,
    };

    if (options.html) content.html = options.html;
    if (options.text) content.text = options.text;
    if (options.replyTo) content.reply_to = options.replyTo;

    if (options.attachments && options.attachments.length > 0) {
      content.attachments = options.attachments.map((a) => ({
        name: a.name ?? 'attachment',
        type: a.mime,
        data: a.file.toString('base64'),
      }));
    }

    const payload: Record<string, unknown> = {
      recipients,
      content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const baseUrl =
      this.config.region === 'eu'
        ? 'https://api.eu.sparkpost.com'
        : 'https://api.sparkpost.com';

    try {
      const response = await axios.post<SparkPostSendResponse>(
        `${baseUrl}/api/v1/transmissions`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.config.apiKey,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.results.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        const firstError = Array.isArray(errors) ? errors[0] : undefined;
        throw new ConnectorError({
          message: firstError?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: firstError?.code,
          providerMessage: firstError?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown SparkPost error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
