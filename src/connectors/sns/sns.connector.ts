import aws4 from 'aws4';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  ISmsOptions,
  ISmsProvider,
  ISendMessageSuccessResponse,
  WithPassthrough} from '../../types';
import {
  ChannelTypeEnum
} from '../../types';
import { ConnectorError } from '../../utils';
import type { SnsConfig } from './sns.config';

export class SnsSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'sns';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.PASCAL_CASE;

  constructor(private config: SnsConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      Action: 'Publish',
      PhoneNumber: options.to,
      Message: options.content,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value));
    }

    const host = `sns.${this.config.region}.amazonaws.com`;
    const serializedBody = params.toString();

    const signedRequest = aws4.sign(
      {
        service: 'sns',
        region: this.config.region,
        method: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
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
      const response = await axios.post<string>(
        `https://${host}/`,
        serializedBody,
        {
          headers: {
            ...(signedRequest.headers as Record<string, string>),
            ...passthroughHeaders,
          },
        }
      );

      const messageId = this.extractMessageId(response.data);

      return {
        id: messageId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorCode = this.extractXmlTag(
          error.response?.data as string,
          'Code'
        );
        const errorMessage = this.extractXmlTag(
          error.response?.data as string,
          'Message'
        );

        throw new ConnectorError({
          message: errorMessage ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: errorCode,
          providerMessage: errorMessage,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown SNS error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }

  private extractMessageId(xml: string): string {
    return this.extractXmlTag(xml, 'MessageId') ?? '';
  }

  private extractXmlTag(xml: string | undefined, tag: string): string | undefined {
    if (!xml) return undefined;
    const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return match?.[1];
  }
}
