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
import type { OneSignalConfig } from './onesignal.config';
import type { OneSignalSendResponse } from './onesignal.types';

export class OneSignalPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'one-signal';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: OneSignalConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};

    const payload: Record<string, unknown> = {
      app_id: this.config.appId,
      contents: { en: overrides.body ?? options.content },
      headings: { en: overrides.title ?? options.title },
      include_subscription_ids: options.target,
      target_channel: 'push',
    };

    if (options.payload && Object.keys(options.payload).length > 0) {
      payload.data = options.payload;
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    let response;
    try {
      response = await axios.post<OneSignalSendResponse>(
        'https://api.onesignal.com/notifications',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${this.config.apiKey}`,
            ...passthroughHeaders,
          },
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;
        const firstError = Array.isArray(errors) ? errors[0] : undefined;
        throw new ConnectorError({
          message: firstError ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: firstError,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown OneSignal error',
        statusCode: 500,
        cause: error as Error,
      });
    }

    if (!response.data.id) {
      const errors = response.data.errors;
      const message = Array.isArray(errors)
        ? errors.join('; ')
        : 'OneSignal push failed';
      throw new ConnectorError({
        message,
        statusCode: 400,
        providerMessage: message,
      });
    }

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }
}
