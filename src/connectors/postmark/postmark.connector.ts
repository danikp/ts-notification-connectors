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
import type { PostmarkConfig } from './postmark.config';
import type { PostmarkSendEmailResponse } from './postmark.types';

export class PostmarkEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'postmark';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.PASCAL_CASE;

  constructor(private config: PostmarkConfig) {
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
      From: fromAddress,
      To: options.to.join(', '),
      Subject: options.subject,
    };

    if (options.html) payload.HtmlBody = options.html;
    if (options.text) payload.TextBody = options.text;
    if (options.replyTo) payload.ReplyTo = options.replyTo;
    if (options.cc && options.cc.length > 0) payload.Cc = options.cc.join(', ');
    if (options.bcc && options.bcc.length > 0) payload.Bcc = options.bcc.join(', ');

    if (options.attachments && options.attachments.length > 0) {
      payload.Attachments = options.attachments.map((a) => ({
        Name: a.name ?? 'attachment',
        Content: a.file.toString('base64'),
        ContentType: a.mime,
      }));
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<PostmarkSendEmailResponse>(
        'https://api.postmarkapp.com/email',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Postmark-Server-Token': this.config.serverToken,
            ...passthroughHeaders,
          },
        }
      );

      if (response.data.ErrorCode !== 0) {
        throw new ConnectorError({
          message: response.data.Message,
          statusCode: 422,
          providerCode: String(response.data.ErrorCode),
          providerMessage: response.data.Message,
        });
      }

      return {
        id: response.data.MessageID,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.Message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: String(error.response?.data?.ErrorCode),
          providerMessage: error.response?.data?.Message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Postmark error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
