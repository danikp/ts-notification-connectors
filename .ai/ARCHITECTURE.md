# Architecture

## Overview

ts-notification-connectors provides lightweight notification connectors for email (SES, Resend, Mailgun), SMS (Vonage, Twilio, Plivo, SNS), push (FCM, Expo, APNs), and chat (Telegram, Slack, WhatsApp). It replaces `@novu/providers` by implementing the same TypeScript interfaces but using direct HTTP calls instead of vendor SDKs.

## Package Structure

```
src/
├── index.ts              # Barrel export — public API surface
├── base.provider.ts      # Abstract BaseProvider with transform/passthrough logic
├── types/                # Novu-compatible interfaces and enums
│   └── provider-id.enum.ts  # EmailProviderIdEnum, SmsProviderIdEnum, PushProviderIdEnum, ChatProviderIdEnum
├── utils/                # ConnectorError, casing transforms, deep merge
└── connectors/
    ├── ses/              # AWS SES v2 email
    ├── resend/           # Resend email
    ├── mailgun/          # Mailgun email
    ├── vonage/           # Vonage (Nexmo) SMS
    ├── twilio/           # Twilio SMS
    ├── plivo/            # Plivo SMS
    ├── sns/              # AWS SNS SMS
    ├── fcm/              # Firebase Cloud Messaging push
    ├── expo/             # Expo push
    ├── apns/             # Apple Push Notification service
    ├── telegram/         # Telegram chat
    ├── slack/            # Slack chat
    └── whatsapp/         # WhatsApp Business chat
```

## Interface Compatibility

All connectors implement interfaces from `src/types/` that are exact replicas of Novu's `@novu/stateless` package:

- `IEmailProvider` — `SesEmailConnector`, `ResendEmailConnector`, `MailgunEmailConnector`
- `ISmsProvider` — `VonageSmsConnector`, `TwilioSmsConnector`, `PlivoSmsConnector`, `SnsSmsConnector`
- `IPushProvider` — `FcmPushConnector`, `ExpoPushConnector`, `ApnsPushConnector`
- `IChatProvider` — `TelegramChatConnector`, `SlackChatConnector`, `WhatsAppChatConnector`

The `id` property on each connector matches Novu's provider enum values for drop-in compatibility.

## Provider ID Enums

The library exports Novu-compatible provider ID enums from `src/types/provider-id.enum.ts`:

- `EmailProviderIdEnum` — `SES = 'ses'`, `Resend = 'resend'`, `Mailgun = 'mailgun'`
- `SmsProviderIdEnum` — `Nexmo = 'nexmo'`, `Twilio = 'twilio'`, `Plivo = 'plivo'`, `SNS = 'sns'`
- `PushProviderIdEnum` — `FCM = 'fcm'`, `EXPO = 'expo'`, `APNS = 'apns'`
- `ChatProviderIdEnum` — `Telegram = 'telegram'`, `Slack = 'slack'`, `WhatsAppBusiness = 'whatsapp-business'`

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

| Connector | API                                                                 | Auth                | Format                   |
|-----------|---------------------------------------------------------------------|---------------------|--------------------------|
| SES       | SES v2 `POST email.{region}.amazonaws.com/v2/email/outbound-emails` | AWS Sig V4 (`aws4`) | JSON                     |
| Resend    | `POST api.resend.com/emails`                                        | Bearer token        | JSON                     |
| Mailgun   | `POST api.mailgun.net/v3/{domain}/messages`                         | Basic (`api:{key}`) | form-encoded / multipart |

**SES attachments:** Raw MIME message built in-memory, base64 encoded into `Content.Raw.Data`.
**Mailgun attachments:** Multipart form-data with file parts. Falls back to URL-encoded for simple messages.

### SMS Connectors

| Connector | API                                                           | Auth                         | Format                     |
|-----------|---------------------------------------------------------------|------------------------------|----------------------------|
| Vonage    | `POST rest.nexmo.com/sms/json`                                | api_key + api_secret in body | form-encoded               |
| Twilio    | `POST api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` | Basic (`SID:Token`)          | form-encoded               |
| Plivo     | `POST api.plivo.com/v1/Account/{id}/Message/`                 | Basic (`ID:Token`)           | JSON                       |
| SNS       | `POST sns.{region}.amazonaws.com/`                            | AWS Sig V4 (`aws4`)          | form-encoded, XML response |

**Vonage quirk:** returns HTTP 200 even on errors — check `messages[0].status === '0'`.
**SNS quirk:** XML response — `MessageId` extracted via regex, no XML parser.
**Plivo quirk:** trailing slash required in URL; returns `message_uuid` array.

### Push Connectors

| Connector | API                                                             | Auth                      | Format |
|-----------|-----------------------------------------------------------------|---------------------------|--------|
| FCM       | FCM v1 `POST fcm.googleapis.com/v1/projects/{id}/messages:send` | OAuth2 Bearer (RS256 JWT) | JSON   |
| Expo      | `POST exp.host/--/api/v2/push/send`                             | Bearer token (optional)   | JSON   |
| APNs      | `POST api.push.apple.com/3/device/{token}` (HTTP/2)             | Bearer JWT (ES256)        | JSON   |

### Chat Connectors

| Connector | API                                                            | Auth                    | Format |
|-----------|----------------------------------------------------------------|-------------------------|--------|
| Telegram  | `POST api.telegram.org/bot{token}/sendMessage`                 | Bot token in URL path   | JSON   |
| Slack     | `POST {webhookUrl}`                                            | None (URL is auth)      | JSON   |
| WhatsApp  | `POST graph.facebook.com/v21.0/{phoneNumberId}/messages`       | Bearer token            | JSON   |

**Slack quirk:** Incoming webhooks return string `"ok"` — no message ID available.
**WhatsApp quirk:** Response contains `messages` array — extract first `id`.

**FCM/APNs multicast:** `Promise.allSettled()` per token (no native multicast).
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
