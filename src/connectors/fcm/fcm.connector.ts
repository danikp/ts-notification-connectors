import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
  WithPassthrough} from '../../types';
import {
  ChannelTypeEnum
} from '../../types';
import { ConnectorError } from '../../utils';
import type { FcmConfig } from './fcm.config';
import type { FcmMessage, FcmSendRequest, FcmSendResponse } from './fcm.types';
import type { TokenCache} from './fcm.auth';
import { getAccessToken } from './fcm.auth';

export class FcmPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'fcm';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.SNAKE_CASE;

  private tokenCache: TokenCache | null = null;

  constructor(private config: FcmConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { token, cache } = await getAccessToken(
      this.config.email,
      this.config.secretKey,
      this.tokenCache
    );
    this.tokenCache = cache;

    const overrides = options.overrides ?? {};
    const {
      type,
      android,
      apns,
      fcmOptions,
      webPush,
      data,
      tag,
      body,
      icon,
      badge,
      color,
      sound,
      title,
    } = overrides;

    const triggerPayload: Record<string, unknown> = {};
    if (type) triggerPayload.type = type;
    if (android) triggerPayload.android = android;
    if (apns) triggerPayload.apns = apns;
    if (fcmOptions) triggerPayload.fcmOptions = fcmOptions;
    if (webPush) triggerPayload.webPush = webPush;
    if (data) triggerPayload.data = data;
    if (tag) triggerPayload.tag = tag;
    if (body) triggerPayload.body = body;
    if (icon) triggerPayload.icon = icon;
    if (badge !== undefined) triggerPayload.badge = badge;
    if (color) triggerPayload.color = color;
    if (sound) triggerPayload.sound = sound;
    if (title) triggerPayload.title = title;

    const { body: transformedBody, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(bridgeProviderData, triggerPayload);

    const sendUrl = `https://fcm.googleapis.com/v1/projects/${this.config.projectId}/messages:send`;

    const resolvedTitle = (transformedBody.title as string) ?? options.title;
    const content = (transformedBody.body as string) ?? options.content;
    const resolvedType = transformedBody.type as string | undefined;
    const resolvedAndroid = transformedBody.android as Record<string, unknown> | undefined;
    const resolvedApns = transformedBody.apns as Record<string, unknown> | undefined;
    const resolvedFcmOptions = transformedBody.fcm_options as Record<string, unknown> | undefined;
    const resolvedWebpush = transformedBody.web_push as Record<string, unknown> | undefined;
    const resolvedData = transformedBody.data as Record<string, string> | undefined;

    // Check if topic-based delivery (set via passthrough)
    if (transformedBody.topic) {
      const message = this.buildMessage(
        undefined,
        transformedBody.topic as string,
        resolvedTitle,
        content,
        resolvedType,
        resolvedAndroid,
        resolvedApns,
        resolvedFcmOptions,
        resolvedWebpush,
        resolvedData,
        options.payload
      );

      try {
        const response = await axios.post<FcmSendResponse>(
          sendUrl,
          { message } as FcmSendRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...passthroughHeaders,
            },
          }
        );

        return {
          ids: [response.data.name],
          date: new Date().toISOString(),
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new ConnectorError({
            message: error.response?.data?.error?.message ?? error.message,
            statusCode: error.response?.status ?? 500,
            providerCode: error.response?.data?.error?.code?.toString(),
            providerMessage: error.response?.data?.error?.message,
            cause: error,
          });
        }

        throw new ConnectorError({
          message: (error as Error).message ?? 'Unknown FCM error',
          statusCode: 500,
          cause: error as Error,
        });
      }
    }

    // Token-based delivery: one HTTP call per target token
    const results = await Promise.allSettled(
      options.target.map(async (deviceToken) => {
        const message = this.buildMessage(
          deviceToken,
          undefined,
          resolvedTitle,
          content,
          resolvedType,
          resolvedAndroid,
          resolvedApns,
          resolvedFcmOptions,
          resolvedWebpush,
          resolvedData,
          options.payload
        );

        const response = await axios.post<FcmSendResponse>(
          sendUrl,
          { message } as FcmSendRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...passthroughHeaders,
            },
          }
        );

        return response.data.name;
      })
    );

    const ids: string[] = [];
    let allFailed = true;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        ids.push(result.value);
        allFailed = false;
      } else {
        const err = result.reason;
        if (axios.isAxiosError(err)) {
          ids.push(
            err.response?.data?.error?.message ?? err.message
          );
        } else {
          ids.push((err as Error).message ?? 'Unknown error');
        }
      }
    }

    if (allFailed) {
      throw new ConnectorError({
        message: `All ${options.target.length} FCM message(s) failed to send`,
        statusCode: 500,
        providerMessage: ids.join('; '),
      });
    }

    return {
      ids,
      date: new Date().toISOString(),
    };
  }

  private buildMessage(
    deviceToken: string | undefined,
    topic: string | undefined,
    title: string,
    content: string,
    type: string | undefined,
    android: Record<string, unknown> | undefined,
    apns: Record<string, unknown> | undefined,
    fcmOptions: Record<string, unknown> | undefined,
    webpush: Record<string, unknown> | undefined,
    data: Record<string, string> | undefined,
    payload: object
  ): FcmMessage {
    const message: FcmMessage = {};

    if (deviceToken) {
      message.token = deviceToken;
    }

    if (topic) {
      message.topic = topic;
    }

    if (type === 'data') {
      message.data = {
        title,
        body: content,
        ...this.cleanPayload(payload),
        ...data,
      };
    } else {
      message.notification = {
        title,
        body: content,
      };

      const payloadData = this.cleanPayload(payload);
      if (data || Object.keys(payloadData).length > 0) {
        message.data = {
          ...payloadData,
          ...data,
        };
      }
    }

    if (android) {
      message.android = android;
    }

    if (apns) {
      message.apns = apns;
    }

    if (fcmOptions) {
      message.fcmOptions = fcmOptions;
    }

    if (webpush) {
      message.webpush = webpush;
    }

    return message;
  }

  private cleanPayload(payload: object): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else {
        result[key] = JSON.stringify(value);
      }
    }

    return result;
  }
}
