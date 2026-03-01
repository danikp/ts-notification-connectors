# Architecture

## Overview

ts-notification-connectors provides lightweight notification connectors for email (SES, Resend, Mailgun, SendGrid, Postmark, MailerSend, Mailtrap, Brevo, SparkPost), SMS (Vonage, Twilio, Plivo, SNS, Sinch, Telnyx, Infobip, MessageBird, Textmagic, D7 Networks), push (FCM, Expo, APNs, OneSignal, Pushover, Pusher Beams, ntfy, Pushbullet, WonderPush), and chat (Telegram, Slack, WhatsApp, Discord, MS Teams, Google Chat, Mattermost, Rocket.Chat, LINE). It replaces `@novu/providers` by implementing the same TypeScript interfaces but using direct HTTP calls instead of vendor SDKs.

## Package Structure

```
src/
├── index.ts              # Barrel export — public API surface
├── base.provider.ts      # Abstract BaseProvider with transform/passthrough logic
├── types/                # Novu-compatible interfaces and enums
│   └── provider-id.enum.ts  # EmailProviderIdEnum, SmsProviderIdEnum, PushProviderIdEnum, ChatProviderIdEnum
├── utils/                # ConnectorError, casing transforms, deep merge
├── facades/              # Channel facades — unified entry point per channel
│   ├── email.facade.ts   # Email facade (SES, Resend, Mailgun, SendGrid, Postmark, MailerSend, Mailtrap, Brevo, SparkPost)
│   ├── sms.facade.ts     # Sms facade (Vonage, Twilio, Plivo, SNS, Sinch, Telnyx, Infobip, MessageBird, Textmagic, D7 Networks)
│   ├── push.facade.ts    # Push facade (FCM, Expo, APNs, OneSignal, Pushover, Pusher Beams, ntfy, Pushbullet, WonderPush)
│   └── chat.facade.ts    # Chat facade (Telegram, Slack, WhatsApp, Discord, MS Teams, Google Chat, Mattermost, Rocket.Chat, LINE)
└── connectors/
    ├── ses/              # AWS SES v2 email
    ├── resend/           # Resend email
    ├── mailgun/          # Mailgun email
    ├── sendgrid/         # SendGrid (Twilio SendGrid) email
    ├── postmark/         # Postmark email
    ├── mailersend/       # MailerSend email
    ├── mailtrap/         # Mailtrap email
    ├── brevo/            # Brevo (formerly Sendinblue) email
    ├── sparkpost/        # SparkPost email
    ├── vonage/           # Vonage (Nexmo) SMS
    ├── twilio/           # Twilio SMS
    ├── plivo/            # Plivo SMS
    ├── sns/              # AWS SNS SMS
    ├── sinch/            # Sinch SMS
    ├── telnyx/           # Telnyx SMS
    ├── infobip/          # Infobip SMS
    ├── messagebird/      # MessageBird SMS
    ├── textmagic/        # Textmagic SMS
    ├── d7networks/       # D7 Networks SMS
    ├── fcm/              # Firebase Cloud Messaging push
    ├── expo/             # Expo push
    ├── apns/             # Apple Push Notification service
    ├── onesignal/        # OneSignal push
    ├── pushover/         # Pushover push
    ├── pusher-beams/     # Pusher Beams push
    ├── ntfy/             # ntfy push
    ├── pushbullet/       # Pushbullet push
    ├── wonderpush/       # WonderPush push
    ├── telegram/         # Telegram chat
    ├── slack/            # Slack chat
    ├── whatsapp/         # WhatsApp Business chat
    ├── discord/          # Discord chat (webhooks)
    ├── msteams/          # Microsoft Teams chat (webhooks)
    ├── google-chat/      # Google Chat (webhooks)
    ├── mattermost/       # Mattermost chat (webhooks)
    ├── rocketchat/       # Rocket.Chat chat (REST API)
    └── line/             # LINE Messaging API chat
```

## Channel Facades

Four facade classes provide a unified entry point per notification channel, accepting either a provider ID enum + config or a custom connector instance:

- `Email` (`src/facades/email.facade.ts`) — wraps SES, Resend, Mailgun, SendGrid, Postmark, MailerSend, Mailtrap, Brevo, SparkPost; also delegates `checkIntegration` (returns success fallback if connector doesn't implement it)
- `Sms` (`src/facades/sms.facade.ts`) — wraps Vonage, Twilio, Plivo, SNS, Sinch, Telnyx, Infobip, MessageBird, Textmagic, D7 Networks
- `Push` (`src/facades/push.facade.ts`) — wraps FCM, Expo, APNs, OneSignal, Pushover, Pusher Beams, ntfy, Pushbullet, WonderPush
- `Chat` (`src/facades/chat.facade.ts`) — wraps Telegram, Slack, WhatsApp, Discord, MS Teams, Google Chat, Mattermost, Rocket.Chat, LINE

### Design

- **Per-enum-value constructor overloads** — TypeScript enforces that the config type matches the provider ID at compile time (e.g., `new Email(EmailProviderIdEnum.SES, sesConfig)` requires `SesConfig`)
- **Custom connector overload** — first overload accepts any `IEmailProvider` / `ISmsProvider` / etc., enabling custom connectors without facade changes
- **No BaseProvider inheritance** — facades don't need casing transforms; they implement the channel interface directly and delegate all calls
- **`id` and `channelType`** — set from the provider ID when using enum+config, or copied from the connector instance

### Usage

```ts
import { Email, EmailProviderIdEnum } from 'ts-notification-connectors';

// Provider ID + config (type-safe):
const email = new Email(EmailProviderIdEnum.SES, sesConfig);
await email.sendMessage(options);

// Custom connector:
const email = new Email(myCustomConnector);
await email.sendMessage(options);
```

## Interface Compatibility

All connectors implement interfaces from `src/types/` that are exact replicas of Novu's `@novu/stateless` package:

- `IEmailProvider` — `SesEmailConnector`, `ResendEmailConnector`, `MailgunEmailConnector`, `SendgridEmailConnector`, `PostmarkEmailConnector`, `MailerSendEmailConnector`, `MailtrapEmailConnector`, `BrevoEmailConnector`, `SparkPostEmailConnector`
- `ISmsProvider` — `VonageSmsConnector`, `TwilioSmsConnector`, `PlivoSmsConnector`, `SnsSmsConnector`, `SinchSmsConnector`, `TelnyxSmsConnector`, `InfobipSmsConnector`, `MessageBirdSmsConnector`, `TextmagicSmsConnector`, `D7NetworksSmsConnector`
- `IPushProvider` — `FcmPushConnector`, `ExpoPushConnector`, `ApnsPushConnector`, `OneSignalPushConnector`, `PushoverPushConnector`, `PusherBeamsPushConnector`, `NtfyPushConnector`, `PushbulletPushConnector`, `WonderPushPushConnector`
- `IChatProvider` — `TelegramChatConnector`, `SlackChatConnector`, `WhatsAppChatConnector`, `DiscordChatConnector`, `MsTeamsChatConnector`, `GoogleChatChatConnector`, `MattermostChatConnector`, `RocketChatChatConnector`, `LineChatConnector`

The `id` property on each connector matches Novu's provider enum values for drop-in compatibility.

## Provider ID Enums

The library exports Novu-compatible provider ID enums from `src/types/provider-id.enum.ts`:

- `EmailProviderIdEnum` — `SES = 'ses'`, `Resend = 'resend'`, `Mailgun = 'mailgun'`, `Sendgrid = 'sendgrid'`, `Postmark = 'postmark'`, `MailerSend = 'mailersend'`, `Mailtrap = 'mailtrap'`, `Brevo = 'brevo'`, `SparkPost = 'sparkpost'`
- `SmsProviderIdEnum` — `Nexmo = 'nexmo'`, `Twilio = 'twilio'`, `Plivo = 'plivo'`, `SNS = 'sns'`, `Sinch = 'sinch'`, `Telnyx = 'telnyx'`, `Infobip = 'infobip'`, `MessageBird = 'messagebird'`, `Textmagic = 'textmagic'`, `D7Networks = 'd7networks'`
- `PushProviderIdEnum` — `FCM = 'fcm'`, `EXPO = 'expo'`, `APNS = 'apns'`, `OneSignal = 'one-signal'`, `Pushover = 'pushover'`, `PusherBeams = 'pusher-beams'`, `Ntfy = 'ntfy'`, `Pushbullet = 'pushbullet'`, `WonderPush = 'wonderpush'`
- `ChatProviderIdEnum` — `Telegram = 'telegram'`, `Slack = 'slack'`, `WhatsAppBusiness = 'whatsapp-business'`, `Discord = 'discord'`, `MsTeams = 'msteams'`, `GoogleChat = 'google-chat'`, `Mattermost = 'mattermost'`, `RocketChat = 'rocketchat'`, `LINE = 'line'`

These enums contain only IDs for implemented connectors. When adding a new connector, add its ID to the appropriate enum.

## BaseProvider Pattern

`BaseProvider` is an abstract class providing:

1. **Key casing transform** — each connector declares a `CasingEnum`. The `transform()` method recursively converts keys.

2. **Three-layer merge** — `transform()` merges data in priority order:
   - Trigger data (lowest priority)
   - Bridge known data (cased)
   - `_passthrough.body` (highest priority — raw, unmodified)

3. **Passthrough extraction** — returns `{ body, headers, query }` where headers and query come from `_passthrough`.

## HTTP Patterns

### Email Connectors

| Connector  | API                                                                 | Auth                        | Format                   |
|------------|---------------------------------------------------------------------|-----------------------------|--------------------------|
| SES        | SES v2 `POST email.{region}.amazonaws.com/v2/email/outbound-emails` | AWS Sig V4 (`aws4`)        | JSON                     |
| Resend     | `POST api.resend.com/emails`                                        | Bearer token               | JSON                     |
| Mailgun    | `POST api.mailgun.net/v3/{domain}/messages`                         | Basic (`api:{key}`)        | form-encoded / multipart |
| SendGrid   | `POST api.sendgrid.com/v3/mail/send`                                | Bearer token               | JSON                     |
| Postmark   | `POST api.postmarkapp.com/email`                                    | `X-Postmark-Server-Token`  | JSON (PascalCase)        |
| MailerSend | `POST api.mailersend.com/v1/email`                                  | Bearer token               | JSON                     |
| Mailtrap   | `POST send.api.mailtrap.io/api/send`                                | Bearer token               | JSON                     |
| Brevo      | `POST api.brevo.com/v3/smtp/email`                                  | `api-key` header           | JSON (camelCase)         |
| SparkPost  | `POST api.sparkpost.com/api/v1/transmissions`                       | API key in Authorization   | JSON                     |

**SES attachments:** Raw MIME message built in-memory, base64 encoded into `Content.Raw.Data`.
**Mailgun attachments:** Multipart form-data with file parts. Falls back to URL-encoded for simple messages.
**SendGrid quirk:** Message ID returned in `x-message-id` response header, not body. Response body is empty on 202.
**Postmark quirk:** PascalCase fields (`From`, `To`, `HtmlBody`). `ErrorCode: 0` means success; non-zero is an error.
**MailerSend quirk:** 202 response with message ID in `x-message-id` header (like SendGrid). `from`/`to` as `{ email, name }` objects.
**Mailtrap quirk:** Response contains `message_ids` array — extract first element.
**Brevo quirk:** Uses `api-key` header (not Authorization). Field names are camelCase (`htmlContent`, `textContent`, `sender`). Attachments use singular `attachment` key.
**SparkPost quirk:** Raw API key in Authorization header (no Bearer/Basic prefix). Supports regional endpoint (`api.eu.sparkpost.com` for EU). Nested `recipients`/`content` body structure.

### SMS Connectors

| Connector   | API                                                              | Auth                         | Format                     |
|-------------|------------------------------------------------------------------|------------------------------|----------------------------|
| Vonage      | `POST rest.nexmo.com/sms/json`                                   | api_key + api_secret in body | form-encoded               |
| Twilio      | `POST api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`    | Basic (`SID:Token`)          | form-encoded               |
| Plivo       | `POST api.plivo.com/v1/Account/{id}/Message/`                    | Basic (`ID:Token`)           | JSON                       |
| SNS         | `POST sns.{region}.amazonaws.com/`                               | AWS Sig V4 (`aws4`)          | form-encoded, XML response |
| Sinch       | `POST {region}.sms.api.sinch.com/xms/v1/{planId}/batches`       | Bearer token                 | JSON                       |
| Telnyx      | `POST api.telnyx.com/v2/messages`                                | Bearer token                 | JSON                       |
| Infobip     | `POST {baseUrl}/sms/3/messages`                                  | `App` auth prefix            | JSON (camelCase)           |
| MessageBird | `POST rest.messagebird.com/messages`                             | `AccessKey` auth prefix      | JSON (camelCase)           |
| Textmagic   | `POST rest.textmagic.com/api/v2/messages`                        | `X-TM-Username` + `X-TM-Key`| JSON (camelCase)           |
| D7 Networks | `POST api.d7networks.com/messages/v1/send`                       | Bearer token                 | JSON                       |

**Vonage quirk:** returns HTTP 200 even on errors — check `messages[0].status === '0'`.
**SNS quirk:** XML response — `MessageId` extracted via regex, no XML parser.
**Plivo quirk:** trailing slash required in URL; returns `message_uuid` array.
**Sinch quirk:** Regional base URLs (`us`, `eu`, `au`, `br`, `ca`). Defaults to `us`.
**Telnyx quirk:** Message field is `text` (not `body`). Response wraps in `data` envelope: `response.data.data.id`.
**Infobip quirk:** Account-specific `baseUrl`. Auth uses `App` prefix (not `Bearer`). Body wraps in `messages` array with `destinations`.
**MessageBird quirk:** Auth uses `AccessKey` prefix. Body uses `originator` (not `from`) and `recipients` array.
**Textmagic quirk:** Dual auth headers (`X-TM-Username`, `X-TM-Key`). Body uses `phones` for recipients.
**D7 Networks quirk:** Body wraps in `messages` array with `channel: 'sms'` and `message_globals` for originator.

### Push Connectors

| Connector    | API                                                                | Auth                      | Format        |
|--------------|--------------------------------------------------------------------|---------------------------|---------------|
| FCM          | FCM v1 `POST fcm.googleapis.com/v1/projects/{id}/messages:send`    | OAuth2 Bearer (RS256 JWT) | JSON          |
| Expo         | `POST exp.host/--/api/v2/push/send`                                | Bearer token (optional)   | JSON          |
| APNs         | `POST api.push.apple.com/3/device/{token}` (HTTP/2)                | Bearer JWT (ES256)        | JSON          |
| OneSignal    | `POST api.onesignal.com/notifications`                             | `Key` header              | JSON          |
| Pushover     | `POST api.pushover.net/1/messages.json`                            | Token in request body     | form-encoded  |
| Pusher Beams | `POST {instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/{instanceId}/publishes/interests/{interest}` | Bearer token | JSON |
| ntfy         | `POST {baseUrl}/{topic}`                                           | Bearer token (optional)   | JSON          |
| Pushbullet   | `POST api.pushbullet.com/v2/pushes`                                | `Access-Token` header     | JSON          |
| WonderPush   | `POST management-api.wonderpush.com/v1/deliveries`                 | Query param `accessToken` | form-encoded  |

**OneSignal quirk:** Auth uses `Key` prefix (not `Bearer`). Response is 200 even on "soft failure" — check `id` empty + `errors` array.
**Pushover quirk:** Form-encoded request, JSON response. `status: 1` means success. Per-target sends via `Promise.allSettled()`. Returns `request` ID (not message ID).
**Pusher Beams quirk:** Instance ID in URL path. Sends cross-platform payload (`fcm`, `apns`, `web`).
**ntfy quirk:** Optional self-hosted base URL (defaults to `https://ntfy.sh`). Per-topic sends via `Promise.allSettled()`. Optional Bearer auth.
**Pushbullet quirk:** Uses `Access-Token` header (not `Authorization`). Per-target sends with `device_iden`. Returns `iden` as message ID.
**WonderPush quirk:** Auth via `accessToken` query parameter. Form-encoded body with `targetUserIds` and `notification` as JSON-stringified object.

### Chat Connectors

| Connector   | API                                                            | Auth                          | Format              |
|-------------|----------------------------------------------------------------|-------------------------------|---------------------|
| Telegram    | `POST api.telegram.org/bot{token}/sendMessage`                 | Bot token in URL path         | JSON                |
| Slack       | `POST {webhookUrl}`                                            | None (URL is auth)            | JSON                |
| WhatsApp    | `POST graph.facebook.com/v21.0/{phoneNumberId}/messages`       | Bearer token                  | JSON                |
| Discord     | `POST discord.com/api/webhooks/{id}/{token}?wait=true`         | None (URL is auth)            | JSON                |
| MS Teams    | `POST {webhookUrl}` (Power Automate Workflow URL)              | None (URL is auth)            | JSON (Adaptive Card)|
| Google Chat | `POST {webhookUrl}`                                            | None (URL is auth)            | JSON                |
| Mattermost  | `POST {webhookUrl}`                                            | None (URL is auth)            | JSON                |
| Rocket.Chat | `POST {serverUrl}/api/v1/chat.sendMessage`                     | `X-Auth-Token` + `X-User-Id`  | JSON (camelCase)    |
| LINE        | `POST api.line.me/v2/bot/message/push`                         | Bearer token                  | JSON (camelCase)    |

**Slack quirk:** Incoming webhooks return string `"ok"` — no message ID available.
**WhatsApp quirk:** Response contains `messages` array — extract first `id`.
**Discord quirk:** `?wait=true` query param required to get message ID in response. Max 2,000 chars for `content`.
**MS Teams quirk:** Response is string `"1"` — no message ID. Requires Adaptive Card format for Workflow webhooks.
**Google Chat quirk:** Webhook URL is auth. Response contains `name` as message identifier.
**Mattermost quirk:** Incoming webhooks return string `"ok"` (like Slack) — no message ID.
**Rocket.Chat quirk:** Dual auth headers (`X-Auth-Token`, `X-User-Id`). Check `response.data.success` — throws if false. Returns `message._id`.
**LINE quirk:** Push messaging API requires `to` (user ID). Response contains `sentMessages` array — extract first `id`.

**FCM/APNs/Pushover/ntfy/Pushbullet multicast:** `Promise.allSettled()` per token/topic (no native multicast).
**APNs HTTP/2:** Uses Node's built-in `http2` module. Session shared across tokens within a single `sendMessage` call.

## Token Lifecycles

### FCM

1. `createSignedJwt()` — RS256 JWT using `crypto.createSign('RSA-SHA256')`
2. `getAccessToken()` — exchanges JWT at Google's token endpoint
3. Instance-level cache — tokens cached until 5 minutes before expiry

### APNs

1. `createApnsJwt()` — ES256 JWT using `crypto.sign('SHA256')` with `ieee-p1363` encoding
2. `getOrCacheToken()` — cached for 50 minutes (APNs tokens valid for 1 hour)
3. Instance-level cache — each connector instance maintains its own cache

## Error Handling

All API errors are wrapped in `ConnectorError` with:
- `statusCode` — HTTP status
- `providerCode` — provider-specific error code
- `providerMessage` — provider error message
- `cause` — original error (ES2022 Error cause)

## Build Output

Dual CJS/ESM:
- `dist/cjs/` — CommonJS (`tsconfig.json`)
- `dist/esm/` — ES Modules (`tsconfig.esm.json`)
