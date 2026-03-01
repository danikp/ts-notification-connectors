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
import type { PushoverConfig } from './pushover.config';
import type { PushoverSendResponse } from './pushover.types';

export class PushoverPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'pushover';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: PushoverConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};

    const results = await Promise.allSettled(
      options.target.map((userKey) =>
        this.sendToUser(userKey, options, overrides, bridgeProviderData)
      )
    );

    const ids: string[] = [];
    let allFailed = true;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        ids.push(result.value);
        allFailed = false;
      } else {
        ids.push(result.reason?.message ?? 'Pushover push failed');
      }
    }

    if (allFailed) {
      throw new ConnectorError({
        message: `All ${options.target.length} Pushover push message(s) failed`,
        statusCode: 500,
        providerMessage: ids.join('; '),
      });
    }

    return {
      ids,
      date: new Date().toISOString(),
    };
  }

  private async sendToUser(
    userKey: string,
    options: IPushOptions,
    overrides: NonNullable<IPushOptions['overrides']>,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      token: this.config.token,
      user: userKey,
      title: overrides.title ?? options.title,
      message: overrides.body ?? options.content,
    };

    if (overrides.sound !== undefined) payload.sound = overrides.sound;

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value));
    }

    try {
      const response = await axios.post<PushoverSendResponse>(
        'https://api.pushover.net/1/messages.json',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...passthroughHeaders,
          },
        }
      );

      if (response.data.status !== 1) {
        throw new ConnectorError({
          message: response.data.errors?.join('; ') ?? 'Pushover API error',
          statusCode: 400,
          providerMessage: response.data.errors?.join('; '),
        });
      }

      return response.data.request;
    } catch (error) {
      if (error instanceof ConnectorError) throw error;

      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.errors?.[0] ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerMessage: error.response?.data?.errors?.[0],
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Pushover error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
