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
import type { BrevoConfig } from './brevo.config';
import type { BrevoSendResponse } from './brevo.types';

export class BrevoEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'brevo';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: BrevoConfig) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName ?? this.config.senderName;
    const from = options.from ?? this.config.from;

    const payload: Record<string, unknown> = {
      sender: senderName
        ? { name: senderName, email: from }
        : { email: from },
      to: options.to.map((email) => ({ email })),
      subject: options.subject,
    };

    if (options.html) payload.htmlContent = options.html;
    if (options.text) payload.textContent = options.text;
    if (options.replyTo) {
      payload.replyTo = { email: options.replyTo };
    }
    if (options.cc && options.cc.length > 0) {
      payload.cc = options.cc.map((email) => ({ email }));
    }
    if (options.bcc && options.bcc.length > 0) {
      payload.bcc = options.bcc.map((email) => ({ email }));
    }

    if (options.attachments && options.attachments.length > 0) {
      payload.attachment = options.attachments.map((a) => ({
        name: a.name ?? 'attachment',
        content: a.file.toString('base64'),
      }));
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<BrevoSendResponse>(
        'https://api.brevo.com/v3/smtp/email',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.config.apiKey,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.messageId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.code,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Brevo error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
