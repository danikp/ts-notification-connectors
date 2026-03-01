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
import type { MailtrapConfig } from './mailtrap.config';
import type { MailtrapSendResponse } from './mailtrap.types';

export class MailtrapEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'mailtrap';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: MailtrapConfig) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName ?? this.config.senderName;
    const from = options.from ?? this.config.from;

    const payload: Record<string, unknown> = {
      from: senderName ? { email: from, name: senderName } : { email: from },
      to: options.to.map((email) => ({ email })),
      subject: options.subject,
    };

    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.cc && options.cc.length > 0) {
      payload.cc = options.cc.map((email) => ({ email }));
    }
    if (options.bcc && options.bcc.length > 0) {
      payload.bcc = options.bcc.map((email) => ({ email }));
    }

    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.name ?? 'attachment',
        content: a.file.toString('base64'),
        type: a.mime,
      }));
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<MailtrapSendResponse>(
        'https://send.api.mailtrap.io/api/send',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiToken}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.message_ids[0],
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.error,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Mailtrap error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
