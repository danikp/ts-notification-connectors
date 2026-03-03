# Project Guidelines

## Overview

ts-notification-connectors — lightweight, SDK-free notification connectors for email (SES, Resend, Mailgun, SendGrid, Postmark, MailerSend, Mailtrap, Brevo, SparkPost), SMS (Vonage, Twilio, Plivo, SNS, Sinch, Telnyx, Infobip, MessageBird, Textmagic, D7 Networks, Unicell, SLNG, InforU, Cellact), push (FCM, Expo, APNs, OneSignal, Pushover, Pusher Beams, ntfy, Pushbullet, WonderPush), and chat (Telegram, Slack, WhatsApp, Discord, MS Teams, Google Chat, Mattermost, Rocket.Chat, LINE). Drop-in replacement for `@novu/providers` using direct HTTP calls via `axios` instead of vendor SDKs. Runtime deps: `axios` + `aws4` only.

## Commands

- `npm run typecheck` — type-check without emitting
- `npm test` — run all tests (vitest)
- `npm run build` — build CJS + ESM to `dist/`
- `npm run lint` — lint with ESLint
- `npm run lint:fix` — auto-fix lint issues

## Repository Structure

```
src/
├── index.ts              # Barrel export — public API surface
├── base.provider.ts      # Abstract BaseProvider with casing transform + passthrough merge
├── types/                # Novu-compatible interfaces and enums (barrel: types/index.ts)
│   └── provider-id.enum.ts  # EmailProviderIdEnum, SmsProviderIdEnum, PushProviderIdEnum, ChatProviderIdEnum
├── utils/                # ConnectorError, casing transforms, deep merge (barrel: utils/index.ts)
├── facades/              # Channel facades — unified entry point per channel (barrel: facades/index.ts)
│   ├── email.facade.ts   # Email facade (SES, Resend, Mailgun, SendGrid, Postmark, MailerSend, Mailtrap, Brevo, SparkPost)
│   ├── sms.facade.ts     # Sms facade (Vonage, Twilio, Plivo, SNS, Sinch, Telnyx, Infobip, MessageBird, Textmagic, D7 Networks, Unicell, SLNG, InforU, Cellact)
│   ├── push.facade.ts    # Push facade (FCM, Expo, APNs, OneSignal, Pushover, Pusher Beams, ntfy, Pushbullet, WonderPush)
│   └── chat.facade.ts    # Chat facade (Telegram, Slack, WhatsApp, Discord, MS Teams, Google Chat, Mattermost, Rocket.Chat, LINE)
└── connectors/
    ├── ses/              # AWS SES v2 email — each has *.connector.ts, *.config.ts, *.types.ts, *.connector.spec.ts
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
    ├── unicell/          # Unicell (Soprano) SMS
    ├── slng/             # SLNG SMS
    ├── unforu/           # InforU SMS
    ├── cellact/          # Cellact SMS
    ├── fcm/              # Firebase Cloud Messaging push
    ├── expo/             # Expo push
    ├── apns/             # Apple Push Notification service (HTTP/2, ES256 JWT)
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

Dual CJS/ESM build output in `dist/cjs/` and `dist/esm/`.

## Architecture

### Channel Facades

Four facade classes (`Email`, `Sms`, `Push`, `Chat`) provide a unified entry point per channel. Each accepts either a provider ID enum + config or a custom connector instance:

```ts
import { Email, EmailProviderIdEnum } from 'ts-notification-connectors';
const email = new Email(EmailProviderIdEnum.SES, sesConfig);
await email.sendMessage(options);

// or bring your own connector:
const email = new Email(customConnector);
```

Per-enum-value constructor overloads enforce type-safe config matching at compile time. Facades implement the channel interface directly (no BaseProvider inheritance) and delegate all calls to the underlying connector.

- `Email` — SES, Resend, Mailgun, SendGrid, Postmark, MailerSend, Mailtrap, Brevo, SparkPost (also forwards `checkIntegration` when available)
- `Sms` — Vonage, Twilio, Plivo, SNS, Sinch, Telnyx, Infobip, MessageBird, Textmagic, D7 Networks, Unicell, SLNG, InforU, Cellact
- `Push` — FCM, Expo, APNs, OneSignal, Pushover, Pusher Beams, ntfy, Pushbullet, WonderPush
- `Chat` — Telegram, Slack, WhatsApp, Discord, MS Teams, Google Chat, Mattermost, Rocket.Chat, LINE

### Interface Compatibility

All connectors implement Novu's `@novu/stateless` interfaces:
- `IEmailProvider` — `SesEmailConnector`, `ResendEmailConnector`, `MailgunEmailConnector`, `SendgridEmailConnector`, `PostmarkEmailConnector`, `MailerSendEmailConnector`, `MailtrapEmailConnector`, `BrevoEmailConnector`, `SparkPostEmailConnector`
- `ISmsProvider` — `VonageSmsConnector`, `TwilioSmsConnector`, `PlivoSmsConnector`, `SnsSmsConnector`, `SinchSmsConnector`, `TelnyxSmsConnector`, `InfobipSmsConnector`, `MessageBirdSmsConnector`, `TextmagicSmsConnector`, `D7NetworksSmsConnector`, `UnicellSmsConnector`, `SlngSmsConnector`, `UnforuSmsConnector`, `CellactSmsConnector`
- `IPushProvider` — `FcmPushConnector`, `ExpoPushConnector`, `ApnsPushConnector`, `OneSignalPushConnector`, `PushoverPushConnector`, `PusherBeamsPushConnector`, `NtfyPushConnector`, `PushbulletPushConnector`, `WonderPushPushConnector`
- `IChatProvider` — `TelegramChatConnector`, `SlackChatConnector`, `WhatsAppChatConnector`, `DiscordChatConnector`, `MsTeamsChatConnector`, `GoogleChatChatConnector`, `MattermostChatConnector`, `RocketChatChatConnector`, `LineChatConnector`

### BaseProvider Pattern

Abstract class providing:
1. **Key casing transform** — each connector declares `CasingEnum` (PASCAL_CASE for SES/SNS/Twilio/Postmark/Unicell/SLNG, CAMEL_CASE for Vonage/Expo/APNs/MS Teams/Infobip/MessageBird/Textmagic/Brevo/Pusher Beams/WonderPush/Rocket.Chat/LINE/Google Chat, SNAKE_CASE for FCM/Resend/Mailgun/SendGrid/Plivo/Sinch/Telnyx/OneSignal/Pushover/Telegram/Slack/WhatsApp/Discord/MailerSend/Mailtrap/SparkPost/D7 Networks/ntfy/Pushbullet/Mattermost/InforU/Cellact)
2. **Three-layer merge** — trigger data (lowest) → bridge known data (cased) → `_passthrough.body` (highest, raw)
3. **Passthrough extraction** — returns `{ body, headers, query }`

### HTTP Patterns

| Connector    | Auth                          | Format                     |
|--------------|-------------------------------|----------------------------|
| SES          | AWS Sig V4 (`aws4`)           | JSON                       |
| Resend       | Bearer token                  | JSON                       |
| Mailgun      | Basic (`api:{key}`)           | form-encoded / multipart   |
| SendGrid     | Bearer token                  | JSON                       |
| Postmark     | `X-Postmark-Server-Token`     | JSON (PascalCase)          |
| MailerSend   | Bearer token                  | JSON                       |
| Mailtrap     | Bearer token                  | JSON                       |
| Brevo        | `api-key` header              | JSON (camelCase)           |
| SparkPost    | API key in Authorization      | JSON                       |
| Vonage       | api_key + api_secret in body  | form-encoded               |
| Twilio       | Basic (`SID:Token`)           | form-encoded               |
| Plivo        | Basic (`ID:Token`)            | JSON                       |
| SNS          | AWS Sig V4 (`aws4`)           | form-encoded, XML response |
| Sinch        | Bearer token                  | JSON                       |
| Telnyx       | Bearer token                  | JSON                       |
| Infobip      | `App` auth prefix             | JSON (camelCase)           |
| MessageBird  | `AccessKey` auth prefix       | JSON (camelCase)           |
| Textmagic    | `X-TM-Username` + `X-TM-Key`  | JSON (camelCase)           |
| D7 Networks  | Bearer token                  | JSON                       |
| Unicell      | Credentials in JSON body      | JSON (PascalCase)          |
| SLNG         | Credentials in JSON body      | JSON URL-encoded as form   |
| InforU       | Credentials in XML body       | XML via form param         |
| Cellact      | Credentials as XML attributes | XML via form param         |
| FCM          | OAuth2 Bearer (RS256 JWT)     | JSON                       |
| Expo         | Bearer token (optional)       | JSON                       |
| APNs         | Bearer JWT (ES256)            | JSON via HTTP/2            |
| OneSignal    | `Key` header                  | JSON                       |
| Pushover     | Token in request body         | form-encoded               |
| Pusher Beams | Bearer token                  | JSON                       |
| ntfy         | Bearer token (optional)       | JSON                       |
| Pushbullet   | `Access-Token` header         | JSON                       |
| WonderPush   | Query param `accessToken`     | form-encoded               |
| Telegram     | Bot token in URL path         | JSON                       |
| Slack        | None (webhook URL is auth)    | JSON                       |
| WhatsApp     | Bearer token                  | JSON                       |
| Discord      | None (webhook URL is auth)    | JSON                       |
| MS Teams     | None (webhook URL is auth)    | JSON (Adaptive Card)       |
| Google Chat  | None (webhook URL is auth)    | JSON                       |
| Mattermost   | None (webhook URL is auth)    | JSON                       |
| Rocket.Chat  | `X-Auth-Token` + `X-User-Id`  | JSON (camelCase)           |
| LINE         | Bearer token                  | JSON (camelCase)           |

### Token Lifecycles

- **FCM:** RS256 JWT → OAuth2 token exchange → 5-min-before-expiry cache
- **APNs:** ES256 JWT → 50-min cache (1hr validity) → Node `crypto.sign()` with `ieee-p1363`

## Conventions

### TypeScript
- `strict: true` with `noUncheckedIndexedAccess`
- Target ES2021, lib ES2022 (for Error cause)
- No `any` in public APIs; internal `any` only where Novu interfaces require it

### Imports
- **Barrel imports only:** `../../types` and `../../utils` — never deep paths
- **Type imports:** split `import type { ... }` from `import { ... }` (ESLint `consistent-type-imports`)
- Local connector imports (e.g., `./ses.config`, `./apns.auth`) use direct paths

### ESLint
- Flat config (`eslint.config.mjs`) with `typescript-eslint`
- Key rules: `consistent-type-imports: error`, `no-explicit-any: warn`, `no-unused-vars` with `_` pattern

### Naming
- Classes: `*Connector` (not `*Provider`) for connectors; channel facades use bare names (`Email`, `Sms`, `Push`, `Chat`)
- Config interfaces: `{Name}Config` (e.g., `TwilioConfig`, `ApnsConfig`)
- IDs match Novu enums: `'ses'`, `'resend'`, `'mailgun'`, `'sendgrid'`, `'postmark'`, `'mailersend'`, `'mailtrap'`, `'brevo'`, `'sparkpost'`, `'nexmo'`, `'twilio'`, `'plivo'`, `'sns'`, `'sinch'`, `'telnyx'`, `'infobip'`, `'messagebird'`, `'textmagic'`, `'d7networks'`, `'unicell'`, `'slng'`, `'unforu'`, `'cellact'`, `'fcm'`, `'expo'`, `'apns'`, `'one-signal'`, `'pushover'`, `'pusher-beams'`, `'ntfy'`, `'pushbullet'`, `'wonderpush'`, `'telegram'`, `'slack'`, `'whatsapp-business'`, `'discord'`, `'msteams'`, `'google-chat'`, `'mattermost'`, `'rocketchat'`, `'line'`
- Files: `kebab-case` with connector prefix (e.g., `twilio.connector.ts`, `apns.auth.ts`); facades use `{channel}.facade.ts`

### Error Handling
- All API failures throw `ConnectorError` with `statusCode`, `providerCode`, `providerMessage`, `cause`
- Use `axios.isAxiosError()` for HTTP errors (APNs uses `http2` — errors handled in stream callbacks)

### Testing
- Colocated: `*.connector.spec.ts` next to implementation; facade tests use `*.facade.spec.ts`
- Mock `axios`, `http2`, and auth modules (`aws4`, `fcm.auth`, `apns.auth`) at module level
- Facade tests mock connector modules (`vi.mock('../connectors/ses')`, etc.) and verify delegation
- No real API calls — vitest with `globals: true`

### Dependencies
- Runtime: only `axios` + `aws4`
- All other functionality uses Node.js built-ins (`crypto`, `Buffer`, `http2`)
- No vendor SDKs
