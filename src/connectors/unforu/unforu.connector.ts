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
import type { UnforuConfig } from './unforu.config';

export class UnforuSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'unforu';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: UnforuConfig) {
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
      '<Inforu>',
      '<User>',
      `<Username>${this.escapeXml(this.config.username)}</Username>`,
      `<Password>${this.escapeXml(this.config.password)}</Password>`,
      '</User>',
      '<Content Type="sms">',
      `<Message>${this.escapeXml(options.content)}</Message>`,
      '</Content>',
      '<Recipients>',
      `<PhoneNumber>${this.escapeXml(options.to)}</PhoneNumber>`,
      '</Recipients>',
      '<Settings>',
      `<Sender>${this.escapeXml(from)}</Sender>`,
      '</Settings>',
      '</Inforu>',
    ].join('');

    const body = `InforuXML=${encodeURIComponent(xml)}`;

    try {
      const response = await axios.post<string>(
        'https://api.inforu.co.il/SendMessageXml.ashx',
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...passthroughHeaders,
          },
        }
      );

      const status = this.extractXmlTag(response.data, 'Status');
      if (status !== '1') {
        const description = this.extractXmlTag(response.data, 'Description');
        throw new ConnectorError({
          message: description ?? 'Unforu API error',
          statusCode: 200,
          providerCode: status,
          providerMessage: description,
        });
      }

      return {
        id: undefined,
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
        message: (error as Error).message ?? 'Unknown Unforu error',
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
