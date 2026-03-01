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
import type { PusherBeamsConfig } from './pusher-beams.config';
import type { PusherBeamsSendResponse } from './pusher-beams.types';

export class PusherBeamsPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'pusher-beams';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: PusherBeamsConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};

    const title = overrides.title ?? options.title;
    const body = overrides.body ?? options.content;

    const payload: Record<string, unknown> = {
      users: options.target,
      fcm: {
        notification: { title, body },
      },
      apns: {
        aps: {
          alert: { title, body },
        },
      },
      web: {
        notification: { title, body },
      },
    };

    if (options.payload && Object.keys(options.payload).length > 0) {
      (payload.fcm as Record<string, unknown>).data = options.payload;
    }

    const { body: transformedBody, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const url = `https://${this.config.instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${this.config.instanceId}/publishes/users`;

    try {
      const response = await axios.post<PusherBeamsSendResponse>(
        url,
        transformedBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.secretKey}`,
            ...passthroughHeaders,
          },
        }
      );

      return {
        id: response.data.publishId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.error ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.error,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Pusher Beams error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
