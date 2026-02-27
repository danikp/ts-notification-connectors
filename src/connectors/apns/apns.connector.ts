import http2 from 'http2';
import { BaseProvider, CasingEnum } from '../../base.provider';
import type {
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
  WithPassthrough,
} from '../../types';
import { ChannelTypeEnum } from '../../types';
import { ConnectorError } from '../../utils';
import type { ApnsConfig } from './apns.config';
import type { ApnsTokenCache } from './apns.auth';
import { getOrCacheToken } from './apns.auth';
import type { ApnsPayload } from './apns.types';

export class ApnsPushConnector
  extends BaseProvider
  implements IPushProvider
{
  id = 'apns';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing = CasingEnum.CAMEL_CASE;

  private tokenCache: ApnsTokenCache | null = null;

  constructor(private config: ApnsConfig) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { token, cache } = getOrCacheToken(
      this.config.keyId,
      this.config.teamId,
      this.config.key,
      this.tokenCache
    );
    this.tokenCache = cache;

    const overrides = options.overrides ?? {};

    const apnsPayload: ApnsPayload = {
      aps: {
        alert: {
          title: overrides.title ?? options.title,
          body: overrides.body ?? options.content,
        },
      },
    };

    if (overrides.sound !== undefined)
      apnsPayload.aps.sound = overrides.sound;
    if (overrides.badge !== undefined)
      apnsPayload.aps.badge = overrides.badge;

    if (options.payload) {
      for (const [key, value] of Object.entries(options.payload)) {
        apnsPayload[key] = value;
      }
    }

    const { body: transformedPayload, headers: passthroughHeaders } =
      this.transform<Record<string, unknown>>(
        bridgeProviderData,
        apnsPayload as unknown as Record<string, unknown>
      );

    const host =
      this.config.production !== false
        ? 'api.push.apple.com'
        : 'api.sandbox.push.apple.com';

    const session = http2.connect(`https://${host}`);

    try {
      const results = await Promise.allSettled(
        options.target.map((deviceToken) =>
          this.sendToDevice(
            session,
            deviceToken,
            token,
            transformedPayload,
            passthroughHeaders
          )
        )
      );

      const ids: string[] = [];
      let allFailed = true;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          ids.push(result.value);
          allFailed = false;
        } else {
          const err = result.reason;
          ids.push(
            err instanceof ConnectorError
              ? err.providerMessage ?? err.message
              : (err as Error).message ?? 'Unknown error'
          );
        }
      }

      if (allFailed) {
        throw new ConnectorError({
          message: `All ${options.target.length} APNs message(s) failed to send`,
          statusCode: 500,
          providerMessage: ids.join('; '),
        });
      }

      return {
        ids,
        date: new Date().toISOString(),
      };
    } finally {
      session.close();
    }
  }

  private sendToDevice(
    session: http2.ClientHttp2Session,
    deviceToken: string,
    jwt: string,
    payload: Record<string, unknown>,
    passthroughHeaders: Record<string, string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': this.config.bundleId,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
        ...passthroughHeaders,
      });

      const body = JSON.stringify(payload);
      let responseHeaders: http2.IncomingHttpHeaders = {};
      let responseData = '';

      req.on('response', (headers) => {
        responseHeaders = headers;
      });

      req.on('data', (chunk: Buffer) => {
        responseData += chunk.toString();
      });

      req.on('end', () => {
        const status = Number(responseHeaders[':status'] ?? 500);
        if (status === 200) {
          resolve((responseHeaders['apns-id'] as string) ?? '');
        } else {
          let reason = `APNs request failed with status ${status}`;
          try {
            const parsed = JSON.parse(responseData);
            reason = parsed.reason ?? reason;
          } catch {
            // response may be empty
          }

          reject(
            new ConnectorError({
              message: reason,
              statusCode: status,
              providerCode: reason,
              providerMessage: reason,
            })
          );
        }
      });

      req.on('error', (err) => {
        reject(
          new ConnectorError({
            message: err.message,
            statusCode: 500,
            cause: err,
          })
        );
      });

      req.write(body);
      req.end();
    });
  }
}
