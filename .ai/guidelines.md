# Project Guidelines

## Overview

ts-notification-connectors — lightweight, SDK-free notification connectors for email (SES, Resend, Mailgun), SMS (Vonage, Twilio, Plivo, SNS), push (FCM, Expo, APNs), and chat (Telegram, Slack, WhatsApp). Drop-in replacement for `@novu/providers` using direct HTTP calls via `axios` instead of vendor SDKs. Runtime deps: `axios` + `aws4` only.

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
│   ├── email.facade.ts   # Email facade (SES, Resend, Mailgun)
│   ├── sms.facade.ts     # Sms facade (Vonage, Twilio, Plivo, SNS)
│   ├── push.facade.ts    # Push facade (FCM, Expo, APNs)
│   └── chat.facade.ts    # Chat facade (Telegram, Slack, WhatsApp)
└── connectors/
    ├── ses/              # AWS SES v2 email — each has *.connector.ts, *.config.ts, *.types.ts, *.connector.spec.ts
    ├── resend/           # Resend email
    ├── mailgun/          # Mailgun email
    ├── vonage/           # Vonage (Nexmo) SMS
    ├── twilio/           # Twilio SMS
    ├── plivo/            # Plivo SMS
    ├── sns/              # AWS SNS SMS
    ├── fcm/              # Firebase Cloud Messaging push
    ├── expo/             # Expo push
    ├── apns/             # Apple Push Notification service (HTTP/2, ES256 JWT)
    ├── telegram/         # Telegram chat
    ├── slack/            # Slack chat
    └── whatsapp/         # WhatsApp Business chat
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

- `Email` — SES, Resend, Mailgun (also forwards `checkIntegration` when available)
- `Sms` — Vonage, Twilio, Plivo, SNS
- `Push` — FCM, Expo, APNs
- `Chat` — Telegram, Slack, WhatsApp

### Interface Compatibility

All connectors implement Novu's `@novu/stateless` interfaces:
- `IEmailProvider` — `SesEmailConnector`, `ResendEmailConnector`, `MailgunEmailConnector`
- `ISmsProvider` — `VonageSmsConnector`, `TwilioSmsConnector`, `PlivoSmsConnector`, `SnsSmsConnector`
- `IPushProvider` — `FcmPushConnector`, `ExpoPushConnector`, `ApnsPushConnector`
- `IChatProvider` — `TelegramChatConnector`, `SlackChatConnector`, `WhatsAppChatConnector`

### BaseProvider Pattern

Abstract class providing:
1. **Key casing transform** — each connector declares `CasingEnum` (PASCAL_CASE for SES/SNS/Twilio, CAMEL_CASE for Vonage/Expo/APNs, SNAKE_CASE for FCM/Resend/Mailgun/Plivo/Telegram/Slack/WhatsApp)
2. **Three-layer merge** — trigger data (lowest) → bridge known data (cased) → `_passthrough.body` (highest, raw)
3. **Passthrough extraction** — returns `{ body, headers, query }`

### HTTP Patterns

| Connector | Auth                         | Format                     |
|-----------|------------------------------|----------------------------|
| SES       | AWS Sig V4 (`aws4`)          | JSON                       |
| Resend    | Bearer token                 | JSON                       |
| Mailgun   | Basic (`api:{key}`)          | form-encoded / multipart   |
| Vonage    | api_key + api_secret in body | form-encoded               |
| Twilio    | Basic (`SID:Token`)          | form-encoded               |
| Plivo     | Basic (`ID:Token`)           | JSON                       |
| SNS       | AWS Sig V4 (`aws4`)          | form-encoded, XML response |
| FCM       | OAuth2 Bearer (RS256 JWT)    | JSON                       |
| Expo      | Bearer token (optional)      | JSON                       |
| APNs      | Bearer JWT (ES256)           | JSON via HTTP/2            |
| Telegram  | Bot token in URL path        | JSON                       |
| Slack     | None (webhook URL is auth)   | JSON                       |
| WhatsApp  | Bearer token                 | JSON                       |

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
- IDs match Novu enums: `'ses'`, `'resend'`, `'mailgun'`, `'nexmo'`, `'twilio'`, `'plivo'`, `'sns'`, `'fcm'`, `'expo'`, `'apns'`, `'telegram'`, `'slack'`, `'whatsapp-business'`
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
