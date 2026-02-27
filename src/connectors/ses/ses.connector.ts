import aws4 from 'aws4';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IEmailOptions,
  IAttachmentOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  WithPassthrough} from '../../types';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum
} from '../../types';
import { ConnectorError } from '../../utils';
import type { SesConfig } from './ses.config';
import type { SesV2SendEmailRequest, SesV2SendEmailResponse } from './ses.types';

export class SesEmailConnector
  extends BaseProvider
  implements IEmailProvider
{
  id = 'ses';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.PASCAL_CASE;

  constructor(private config: SesConfig) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName ?? this.config.senderName;
    const from = options.from ?? this.config.from;
    const fromEmailAddress = `${senderName} <${from}>`;

    const destination: SesV2SendEmailRequest['Destination'] = {
      ToAddresses: options.to,
    };

    if (options.cc && options.cc.length > 0) {
      destination.CcAddresses = options.cc;
    }

    if (options.bcc && options.bcc.length > 0) {
      destination.BccAddresses = options.bcc;
    }

    const replyToAddresses = options.replyTo ? [options.replyTo] : undefined;

    let content: SesV2SendEmailRequest['Content'];

    if (options.attachments && options.attachments.length > 0) {
      const mimeMessage = this.buildMimeMessage(
        fromEmailAddress,
        options.to,
        options.cc,
        options.bcc,
        options.replyTo,
        options.subject,
        options.html,
        options.text,
        options.attachments
      );
      const encoded = Buffer.from(mimeMessage).toString('base64');
      content = {
        Raw: {
          Data: encoded,
        },
      };
    } else {
      const body: { Html?: { Data: string; Charset: string }; Text?: { Data: string; Charset: string } } = {};

      if (options.html) {
        body.Html = { Data: options.html, Charset: 'UTF-8' };
      }

      if (options.text) {
        body.Text = { Data: options.text, Charset: 'UTF-8' };
      }

      content = {
        Simple: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: body,
        },
      };
    }

    const requestBody: Record<string, unknown> = {
      FromEmailAddress: fromEmailAddress,
      Destination: destination,
      Content: content,
    };

    if (replyToAddresses) {
      requestBody.ReplyToAddresses = replyToAddresses;
    }

    if (this.config.configurationSetName) {
      requestBody.ConfigurationSetName = this.config.configurationSetName;
    }

    const { body, headers: passthroughHeaders } =
      this.transform<SesV2SendEmailRequest>(bridgeProviderData, requestBody);

    const host = `email.${this.config.region}.amazonaws.com`;
    const serializedBody = JSON.stringify(body);

    const signedRequest = aws4.sign(
      {
        service: 'ses',
        region: this.config.region,
        method: 'POST',
        path: '/v2/email/outbound-emails',
        headers: {
          'Content-Type': 'application/json',
          host,
        },
        body: serializedBody,
      },
      {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      }
    );

    try {
      const response = await axios.post<SesV2SendEmailResponse>(
        `https://${host}/v2/email/outbound-emails`,
        serializedBody,
        {
          headers: {
            ...(signedRequest.headers as Record<string, string>),
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.MessageId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.Code,
          providerMessage: error.response?.data?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown SES error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      await this.sendMessage(options);

      return {
        success: true,
        message: 'Integration successful',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      if (error instanceof ConnectorError) {
        const code =
          error.statusCode === 403 || error.statusCode === 401
            ? CheckIntegrationResponseEnum.BAD_CREDENTIALS
            : CheckIntegrationResponseEnum.FAILED;

        return {
          success: false,
          message: error.providerMessage ?? error.message,
          code,
        };
      }

      return {
        success: false,
        message: (error as Error).message ?? 'Unknown error',
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private buildMimeMessage(
    from: string,
    to: string[],
    cc: string[] | undefined,
    bcc: string[] | undefined,
    replyTo: string | undefined,
    subject: string,
    html: string,
    text: string | undefined,
    attachments: IAttachmentOptions[]
  ): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const lines: string[] = [];

    lines.push(`From: ${from}`);
    lines.push(`To: ${to.join(', ')}`);

    if (cc && cc.length > 0) {
      lines.push(`Cc: ${cc.join(', ')}`);
    }

    if (bcc && bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(', ')}`);
    }

    if (replyTo) {
      lines.push(`Reply-To: ${replyTo}`);
    }

    lines.push(`Subject: ${subject}`);
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');

    // multipart/alternative section for text + html
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    lines.push('');

    if (text) {
      lines.push(`--${altBoundary}`);
      lines.push('Content-Type: text/plain; charset=UTF-8');
      lines.push('Content-Transfer-Encoding: 7bit');
      lines.push('');
      lines.push(text);
      lines.push('');
    }

    lines.push(`--${altBoundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(html);
    lines.push('');

    lines.push(`--${altBoundary}--`);
    lines.push('');

    // Attachment parts
    for (const attachment of attachments) {
      lines.push(`--${boundary}`);
      lines.push(
        `Content-Type: ${attachment.mime}; name="${attachment.name ?? 'attachment'}"`
      );
      lines.push('Content-Transfer-Encoding: base64');

      if (attachment.cid) {
        lines.push(`Content-ID: <${attachment.cid}>`);
        lines.push(
          `Content-Disposition: ${attachment.disposition ?? 'inline'}; filename="${attachment.name ?? 'attachment'}"`
        );
      } else {
        lines.push(
          `Content-Disposition: ${attachment.disposition ?? 'attachment'}; filename="${attachment.name ?? 'attachment'}"`
        );
      }

      lines.push('');
      lines.push(attachment.file.toString('base64'));
      lines.push('');
    }

    lines.push(`--${boundary}--`);
    lines.push('');

    return lines.join('\r\n');
  }
}
