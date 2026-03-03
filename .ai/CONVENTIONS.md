# Conventions

## TypeScript

- `strict: true` with `noUncheckedIndexedAccess`
- Target ES2021, lib ES2022 (for Error cause support)
- No `any` in public APIs; internal `any` only where Novu interfaces require it

## Imports

- Use barrel imports from `../../types` and `../../utils` — never import from deep paths like `../../types/channel.enum`
- Split `import type { ... }` from `import { ... }` when a module has both type-only and runtime exports (enforced by ESLint `consistent-type-imports`)
- Local connector imports (e.g., `./ses.config`, `./fcm.auth`, `./apns.auth`) use direct paths since connector barrels are only for the public API

## ESLint

- Flat config (`eslint.config.mjs`) with `typescript-eslint`
- Key rules: `consistent-type-imports: error`, `no-explicit-any: warn`, `no-unused-vars` with `_` pattern
- Ignores: `dist/`, `node_modules/`, `*.config.*`
- Run: `npm run lint` / `npm run lint:fix`

## Naming

- Connector classes: `*Connector` (not `*Provider`) to avoid confusion with Novu classes
- Channel facade classes: bare channel names (`Email`, `Sms`, `Push`, `Chat`)
- `id` values match Novu provider enums exactly: `'ses'`, `'resend'`, `'mailgun'`, `'sendgrid'`, `'postmark'`, `'mailersend'`, `'mailtrap'`, `'brevo'`, `'sparkpost'`, `'nexmo'`, `'twilio'`, `'plivo'`, `'sns'`, `'sinch'`, `'telnyx'`, `'infobip'`, `'messagebird'`, `'textmagic'`, `'d7networks'`, `'unicell'`, `'slng'`, `'unforu'`, `'cellact'`, `'fcm'`, `'expo'`, `'apns'`, `'one-signal'`, `'pushover'`, `'pusher-beams'`, `'ntfy'`, `'pushbullet'`, `'wonderpush'`, `'telegram'`, `'slack'`, `'whatsapp-business'`, `'discord'`, `'msteams'`, `'google-chat'`, `'mattermost'`, `'rocketchat'`, `'line'`
- Config interfaces: `SesConfig`, `ResendConfig`, `MailgunConfig`, `SendgridConfig`, `PostmarkConfig`, `MailerSendConfig`, `MailtrapConfig`, `BrevoConfig`, `SparkPostConfig`, `VonageConfig`, `TwilioConfig`, `PlivoConfig`, `SnsConfig`, `SinchConfig`, `TelnyxConfig`, `InfobipConfig`, `MessageBirdConfig`, `TextmagicConfig`, `D7NetworksConfig`, `UnicellConfig`, `SlngConfig`, `UnforuConfig`, `CellactConfig`, `FcmConfig`, `ExpoConfig`, `ApnsConfig`, `OneSignalConfig`, `PushoverConfig`, `PusherBeamsConfig`, `NtfyConfig`, `PushbulletConfig`, `WonderPushConfig`, `TelegramConfig`, `SlackConfig`, `WhatsAppConfig`, `DiscordConfig`, `MsTeamsConfig`, `GoogleChatConfig`, `MattermostConfig`, `RocketChatConfig`, `LineConfig`
- Files: `kebab-case` with connector name prefix (e.g., `ses.connector.ts`, `fcm.auth.ts`, `apns.auth.ts`); facades use `{channel}.facade.ts` (e.g., `email.facade.ts`)

## Error Handling

- All API failures throw `ConnectorError` with `statusCode`, `providerCode`, `providerMessage`
- Use `axios.isAxiosError()` to distinguish HTTP errors from other failures (not applicable for APNs which uses `http2`)
- Include original error as `cause`

## Testing

- Colocated test files: `*.connector.spec.ts` next to implementation; facade tests use `*.facade.spec.ts`
- Mock `axios` and external modules (`aws4`, `fcm.auth`, `apns.auth`, `http2`) at module level
- Facade tests mock connector modules (`vi.mock('../connectors/ses')`, etc.) and verify correct instantiation + delegation
- No real API calls in tests
- Test framework: vitest with `globals: true`

## Provider ID Enums

- `src/types/provider-id.enum.ts` must only contain IDs for implemented connectors
- When adding a new connector, add its ID to the appropriate enum and add a constructor overload + switch case to the corresponding channel facade
- When removing a connector, remove its ID and the corresponding facade overload/case

## Dependencies

- Runtime: only `axios` + `aws4`
- All other functionality uses Node.js built-ins (`crypto`, `Buffer`, `http2`)
- No vendor SDKs
