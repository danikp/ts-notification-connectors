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
import type { CellactConfig } from './cellact.config';

export class CellactSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'cellact';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: CellactConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, {});

    const from = options.from ?? this.config.from;

    const xml = [
      '<PALO>',
      '<HEAD>',
      `<FROM>${this.escapeXml(from)}</FROM>`,
      `<APP USER="${this.escapeXml(this.config.username)}" PASSWORD="${this.escapeXml(this.config.password)}"/>`,
      '<CMD>sendtextmt</CMD>',
      '</HEAD>',
      '<BODY>',
      `<CONTENT>${this.escapeXml(options.content)}</CONTENT>`,
      '<DEST_LIST>',
      `<TO>${this.escapeXml(options.to)}</TO>`,
      '</DEST_LIST>',
      '</BODY>',
      '</PALO>',
    ].join('');

    const body = `xmlString=${encodeURIComponent(xml)}`;

    try {
      const response = await axios.post<string>(
        'https://cellactpro.net/GlobalSms/ExternalClient/GlobalAPI.asp',
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...passthroughHeaders,
          },
        }
      );

      const resultCode = this.extractXmlTag(response.data, 'RESULTCODE');
      if (resultCode && resultCode !== '0') {
        const description = this.extractXmlTag(response.data, 'DESCRIPTION');
        throw new ConnectorError({
          message: description ?? 'Cellact API error',
          statusCode: 200,
          providerCode: resultCode,
          providerMessage: description,
        });
      }

      const messageId = this.extractXmlTag(response.data, 'BLMJ');

      return {
        id: messageId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.message,
          statusCode: error.response?.status ?? 500,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Cellact error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private extractXmlTag(xml: string | undefined, tag: string): string | undefined {
    if (!xml) return undefined;
    const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return match?.[1];
  }
}
