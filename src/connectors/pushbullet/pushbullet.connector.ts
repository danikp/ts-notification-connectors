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
import type { PushbulletConfig } from './pushbullet.config';
import type { PushbulletSendResponse } from './pushbullet.types';

export class PushbulletPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'pushbullet';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: PushbulletConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};

    const results = await Promise.allSettled(
      options.target.map((deviceIden) =>
        this.sendToDevice(deviceIden, options, overrides, bridgeProviderData)
      )
    );

    const ids: string[] = [];
    let allFailed = true;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        ids.push(result.value);
        allFailed = false;
      } else {
        ids.push(result.reason?.message ?? 'Pushbullet push failed');
      }
    }

    if (allFailed) {
      throw new ConnectorError({
        message: `All ${options.target.length} Pushbullet push message(s) failed`,
        statusCode: 500,
        providerMessage: ids.join('; '),
      });
    }

    return {
      ids,
      date: new Date().toISOString(),
    };
  }

  private async sendToDevice(
    deviceIden: string,
    options: IPushOptions,
    overrides: NonNullable<IPushOptions['overrides']>,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      type: 'note',
      title: overrides.title ?? options.title,
      body: overrides.body ?? options.content,
      device_iden: deviceIden,
    };

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    try {
      const response = await axios.post<PushbulletSendResponse>(
        'https://api.pushbullet.com/v2/pushes',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': this.config.accessToken,
            ...passthroughHeaders,
          },
        }
      );

      return response.data.iden;
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
        message: (error as Error).message ?? 'Unknown Pushbullet error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
