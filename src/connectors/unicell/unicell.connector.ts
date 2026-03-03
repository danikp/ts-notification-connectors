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
import type { UnicellConfig } from './unicell.config';
import type { UnicellSendResponse } from './unicell.types';

export class UnicellSmsConnector
  extends BaseProvider
  implements ISmsProvider
{
  id = 'unicell';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.PASCAL_CASE;

  constructor(private config: UnicellConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload: Record<string, unknown> = {
      UserName: this.config.username,
      Password: this.config.password,
      SenderName: options.from ?? this.config.from,
      BodyMessage: options.content,
      Recipients: [{ Cellphone: options.to }],
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<UnicellSendResponse>(
        'https://restapi.soprano.co.il/api/Sms',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...passthroughHeaders,
          },
        }
      );

      if (response.data.StatusCode !== 0) {
        throw new ConnectorError({
          message: response.data.StatusDescription ?? 'Unicell API error',
          statusCode: 200,
          providerCode: String(response.data.StatusCode),
          providerMessage: response.data.StatusDescription,
        });
      }

      return {
        id: response.data.References?.[0]?.ReferenceNumber,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.StatusDescription ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.StatusCode != null
            ? String(error.response.data.StatusCode)
            : undefined,
          providerMessage: error.response?.data?.StatusDescription,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Unicell error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
