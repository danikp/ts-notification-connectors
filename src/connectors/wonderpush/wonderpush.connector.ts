import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
  WithPassthrough,
} from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';
import type { WonderPushConfig } from './wonderpush.config';
import type { WonderPushSendResponse } from './wonderpush.types';

export class WonderPushPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'wonderpush';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: WonderPushConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};

    const title = overrides.title ?? options.title;
    const content = overrides.body ?? options.content;

    const notification = JSON.stringify({
      alert: { title, text: content },
    });

    const payload: Record<string, unknown> = {
      targetUserIds: options.target.join(','),
      notification,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value));
    }

    const url = `https://management-api.wonderpush.com/v1/deliveries?accessToken=${encodeURIComponent(this.config.accessToken)}`;

    try {
      const response = await axios.post<WonderPushSendResponse>(
        url,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.notificationId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.error?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.error?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown WonderPush error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
