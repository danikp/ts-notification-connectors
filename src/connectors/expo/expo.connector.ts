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
import type { ExpoConfig } from './expo.config';
import type { ExpoSendResponse } from './expo.types';

export class ExpoPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'expo';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: ExpoConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const overrides = options.overrides ?? {};

    const messages = options.target.map((token) => {
      const message: Record<string, unknown> = {
        to: token,
        title: overrides.title ?? options.title,
        body: overrides.body ?? options.content,
      };

      if (options.payload && Object.keys(options.payload).length > 0) {
        message.data = options.payload;
      }

      if (overrides.sound !== undefined) message.sound = overrides.sound;
      if (overrides.badge !== undefined) message.badge = overrides.badge;

      return message;
    });

    const { body: transformedBody, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(
        bridgeProviderData,
        messages.length === 1 ? messages[0]! : {}
      );

    const requestBody =
      messages.length === 1
        ? { ...messages[0], ...transformedBody }
        : messages;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...passthroughHeaders,
    };

    if (this.config.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.config.accessToken}`;
    }

    let response;
    try {
      response = await axios.post<ExpoSendResponse>(
        'https://exp.host/--/api/v2/push/send',
        requestBody,
        { headers: requestHeaders }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ConnectorError({
          message: error.response?.data?.errors?.[0]?.message ?? error.message,
          statusCode: error.response?.status ?? 500,
          providerCode: error.response?.data?.errors?.[0]?.code,
          providerMessage: error.response?.data?.errors?.[0]?.message,
          cause: error,
        });
      }

      throw new ConnectorError({
        message: (error as Error).message ?? 'Unknown Expo error',
        statusCode: 500,
        cause: error as Error,
      });
    }

    const tickets = response.data.data;
    const ids: string[] = [];
    let allFailed = true;

    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        ids.push(ticket.id!);
        allFailed = false;
      } else {
        ids.push(ticket.message ?? ticket.details?.error ?? 'Expo push failed');
      }
    }

    if (allFailed) {
      throw new ConnectorError({
        message: `All ${options.target.length} Expo push message(s) failed`,
        statusCode: 500,
        providerMessage: ids.join('; '),
      });
    }

    return {
      ids,
      date: new Date().toISOString(),
    };
  }
}
