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
import type { NtfyConfig } from './ntfy.config';
import type { NtfySendResponse } from './ntfy.types';

export class NtfyPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'ntfy';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(private config: NtfyConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};
    const baseUrl = this.config.baseUrl ?? 'https://ntfy.sh';
    const targets =
      options.target.length > 0
        ? options.target
        : this.config.defaultTopic
          ? [this.config.defaultTopic]
          : [];

    if (targets.length === 0) {
      throw new ConnectorError({
        message: 'No target topic specified and no defaultTopic configured',
        statusCode: 400,
      });
    }

    const results = await Promise.allSettled(
      targets.map((topic) =>
        this.sendToTopic(topic, options, overrides, bridgeProviderData, baseUrl)
      )
    );

    const ids: string[] = [];
    let allFailed = true;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        ids.push(result.value);
        allFailed = false;
      } else {
        ids.push(result.reason?.message ?? 'ntfy push failed');
      }
    }

    if (allFailed) {
      throw new ConnectorError({
        message: `All ${targets.length} ntfy push message(s) failed`,
        statusCode: 500,
        providerMessage: ids.join('; '),
      });
    }

    return {
      ids,
      date: new Date().toISOString(),
    };
  }

  private async sendToTopic(
    topic: string,
    options: IPushOptions,
    overrides: NonNullable<IPushOptions['overrides']>,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>,
    baseUrl: string
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      topic,
      title: overrides.title ?? options.title,
      message: overrides.body ?? options.content,
    };

    if (options.payload && Object.keys(options.payload).length > 0) {
      payload.data = options.payload;
    }

    const { body, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, payload);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...passthroughHeaders,
    };

    if (this.config.token) {
      requestHeaders.Authorization = `Bearer ${this.config.token}`;
    }

    try {
      const response = await axios.post<NtfySendResponse>(
        baseUrl,
        body,
        { headers: requestHeaders }
      );

      return response.data.id;
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
        message: (error as Error).message ?? 'Unknown ntfy error',
        statusCode: 500,
        cause: error as Error,
      });
    }
  }
}
