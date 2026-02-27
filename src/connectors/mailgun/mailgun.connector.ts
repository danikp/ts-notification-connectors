import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IEmailOptions,
  IAttachmentOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  WithPassthrough,
} from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';
import type { MailgunConfig } from './mailgun.config';
import type { MailgunSendResponse } from './mailgun.types';

export class MailgunEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'mailgun';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: MailgunConfig) {
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
      to: options.to.join(','),
      subject: options.subject,
    };

    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.cc && options.cc.length > 0) payload.cc = options.cc.join(',');
    if (options.bcc && options.bcc.length > 0) payload.bcc = options.bcc.join(',');

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const formFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      formFields[key] = String(value);
    }

    if (options.replyTo) {
      formFields['h:Reply-To'] = options.replyTo;
    }

    const baseUrl = this.config.baseUrl ?? 'https://api.mailgun.net';
    const url = `${baseUrl}/v3/${this.config.domain}/messages`;
    const username = this.config.username ?? 'api';
    const auth = Buffer.from(`${username}:${this.config.apiKey}`).toString('base64');

    let requestBody: string | Buffer;
    let contentType: string;

    if (options.attachments && options.attachments.length > 0) {
      const { body: multipartBody, boundary } = this.buildMultipartBody(
        formFields,
        options.attachments
      );
      requestBody = multipartBody;
      contentType = `multipart/form-data; boundary=${boundary}`;
    } else {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(formFields)) {
        params.append(key, value);
      }
      requestBody = params.toString();
      contentType = 'application/x-www-form-urlencoded';
    }

    try {
      const response = await axios.post<MailgunSendResponse>(url, requestBody, {
        headers: {
          'Content-Type': contentType,
          Authorization: `Basic ${auth}`,
          ...passthroughHeaders,
        },
      });

      return {
        id: response.data.id,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Mailgun error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }

  private buildMultipartBody(
    fields: Record<string, string>,
    attachments: IAttachmentOptions[]
  ): { body: Buffer; boundary: string } {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const parts: Buffer[] = [];

    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        )
      );
    }

    for (const attachment of attachments) {
      const name = attachment.name ?? 'attachment';
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="${name}"\r\nContent-Type: ${attachment.mime}\r\n\r\n`
        )
      );
      parts.push(attachment.file);
      parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    return { body: Buffer.concat(parts), boundary };
  }
}
