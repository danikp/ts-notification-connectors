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
import type { SendgridConfig } from './sendgrid.config';

export class SendgridEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'sendgrid';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: SendgridConfig) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName ?? this.config.senderName;
    const from = options.from ?? this.config.from;

    const personalization: Record<string, unknown> = {
      to: options.to.map((email) => ({ email })),
      subject: options.subject,
    };

    if (options.cc && options.cc.length > 0) {
      personalization.cc = options.cc.map((email) => ({ email }));
    }
    if (options.bcc && options.bcc.length > 0) {
      personalization.bcc = options.bcc.map((email) => ({ email }));
    }

    const payload: Record<string, unknown> = {
      personalizations: [personalization],
      from: senderName ? { email: from, name: senderName } : { email: from },
      content: [],
    };

    const content: { type: string; value: string }[] = [];
    if (options.text) content.push({ type: 'text/plain', value: options.text });
    if (options.html) content.push({ type: 'text/html', value: options.html });
    payload.content = content;

    if (options.replyTo) {
      payload.reply_to = { email: options.replyTo };
    }

    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map((a) => ({
        content: a.file.toString('base64'),
        type: a.mime,
        filename: a.name ?? 'attachment',
      }));
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.headers['x-message-id'] as string | undefined,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        const firstError = Array.isArray(errors) ? errors[0] : undefined;
        throw new ConnectorError({
          message: firstError?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: firstError?.field,
          providerMessage: firstError?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown SendGrid error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
