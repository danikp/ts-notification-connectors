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
import type { ResendConfig } from './resend.config';
import type { ResendSendEmailResponse } from './resend.types';

export class ResendEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'resend';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: ResendConfig) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName ?? this.config.senderName;
    const from = options.from ?? this.config.from;
    const fromAddress = senderName ? `${senderName} <${from}>` : from;

    const payload: Record<string, unknown> = {
      from: fromAddress,
      to: options.to,
      subject: options.subject,
    };

    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.cc && options.cc.length > 0) payload.cc = options.cc;
    if (options.bcc && options.bcc.length > 0) payload.bcc = options.bcc;
    if (options.replyTo) payload.reply_to = options.replyTo;

    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.name ?? 'attachment',
        content: a.file.toString('base64'),
        content_type: a.mime,
      }));
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<ResendSendEmailResponse>(
        'https://api.resend.com/emails',
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
        id: response.data.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.name,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Resend error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
