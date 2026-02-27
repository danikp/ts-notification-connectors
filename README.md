# ts-notification-connectors

Lightweight, SDK-free notification connectors for email, SMS, push, and chat. A drop-in replacement for `@novu/providers` that uses direct HTTP calls via `axios` instead of heavy vendor SDKs.

**Runtime dependencies:** `axios` + `aws4` (~60KB total vs ~50MB+ for `@novu/providers`)

## Installation

```bash
npm install ts-notification-connectors
```

## Connectors

### Email

| Connector               | Provider ID | Docs                                               |
|-------------------------|-------------|----------------------------------------------------|
| `SesEmailConnector`     | `ses`       | [SES README](src/connectors/ses/README.md)         |
| `ResendEmailConnector`  | `resend`    | [Resend README](src/connectors/resend/README.md)   |
| `MailgunEmailConnector` | `mailgun`   | [Mailgun README](src/connectors/mailgun/README.md) |

### SMS

| Connector            | Provider ID | Docs                                             |
|----------------------|-------------|--------------------------------------------------|
| `VonageSmsConnector` | `nexmo`     | [Vonage README](src/connectors/vonage/README.md) |
| `TwilioSmsConnector` | `twilio`    | [Twilio README](src/connectors/twilio/README.md) |
| `PlivoSmsConnector`  | `plivo`     | [Plivo README](src/connectors/plivo/README.md)   |
| `SnsSmsConnector`    | `sns`       | [SNS README](src/connectors/sns/README.md)       |

### Push

| Connector           | Provider ID | Docs                                         |
|---------------------|-------------|----------------------------------------------|
| `FcmPushConnector`  | `fcm`       | [FCM README](src/connectors/fcm/README.md)   |
| `ExpoPushConnector` | `expo`      | [Expo README](src/connectors/expo/README.md) |
| `ApnsPushConnector` | `apns`      | [APNs README](src/connectors/apns/README.md) |

### Chat

| Connector               | Provider ID         | Docs                                                 |
|-------------------------|---------------------|------------------------------------------------------|
| `TelegramChatConnector` | `telegram`          | [Telegram README](src/connectors/telegram/README.md) |
| `SlackChatConnector`    | `slack`             | [Slack README](src/connectors/slack/README.md)       |
| `WhatsAppChatConnector` | `whatsapp-business` | [WhatsApp README](src/connectors/whatsapp/README.md) |

## Quick Start

### Email (Resend)

```typescript
import { ResendEmailConnector } from 'ts-notification-connectors';

const resend = new ResendEmailConnector({
  apiKey: 're_...',
  from: 'noreply@example.com',
  senderName: 'My App',
});

const result = await resend.sendMessage({
  to: ['user@example.com'],
  subject: 'Hello',
  html: '<h1>Hello World</h1>',
});
```

### SMS (Twilio)

```typescript
import { TwilioSmsConnector } from 'ts-notification-connectors';

const twilio = new TwilioSmsConnector({
  accountSid: 'ACxxxxxxx',
  authToken: '...',
  from: '+15551234567',
});

const result = await twilio.sendMessage({
  to: '+14155550100',
  content: 'Hello from Twilio!',
});
```

### Push (Expo)

```typescript
import { ExpoPushConnector } from 'ts-notification-connectors';

const expo = new ExpoPushConnector({ accessToken: '...' });

const result = await expo.sendMessage({
  target: ['ExponentPushToken[xxx]'],
  title: 'New Message',
  content: 'You have a new notification',
  payload: { orderId: '12345' },
  subscriber: {},
  step: { digest: false, events: undefined, total_count: undefined },
});
```

### Chat (Telegram)

```typescript
import { TelegramChatConnector } from 'ts-notification-connectors';

const telegram = new TelegramChatConnector({
  botToken: '123456:ABC-DEF...',
});

const result = await telegram.sendMessage({
  channel: '987654321',
  content: 'Hello from Telegram!',
});
```

## Migration from @novu/providers

| @novu/providers        | ts-notification-connectors | Provider ID |
|------------------------|----------------------------|-------------|
| `SESEmailProvider`     | `SesEmailConnector`        | `ses`       |
| `ResendEmailProvider`  | `ResendEmailConnector`     | `resend`    |
| `MailgunEmailProvider` | `MailgunEmailConnector`    | `mailgun`   |
| `NexmoSmsProvider`     | `VonageSmsConnector`       | `nexmo`     |
| `TwilioSmsProvider`    | `TwilioSmsConnector`       | `twilio`    |
| `PlivoSmsProvider`     | `PlivoSmsConnector`        | `plivo`     |
| `FcmPushProvider`      | `FcmPushConnector`         | `fcm`       |
| `ExpoPushProvider`     | `ExpoPushConnector`        | `expo`      |
| `APNSPushProvider`     | `ApnsPushConnector`        | `apns`      |

All connectors implement `IEmailProvider`, `ISmsProvider`, `IPushProvider`, or `IChatProvider` with identical `sendMessage` signatures. Provider IDs match Novu's enums for drop-in compatibility.

## Passthrough

All connectors support `bridgeProviderData` for passing additional data to the underlying API:

```typescript
await connector.sendMessage(options, {
  _passthrough: {
    body: { CustomField: 'value' },
    headers: { 'X-Custom-Header': 'value' },
  },
});
```

## Error Handling

All connectors throw `ConnectorError` on API failures:

```typescript
import { ConnectorError } from 'ts-notification-connectors';

try {
  await connector.sendMessage(options);
} catch (err) {
  if (err instanceof ConnectorError) {
    console.error(err.statusCode);      // HTTP status code
    console.error(err.providerCode);    // Provider-specific error code
    console.error(err.providerMessage); // Provider error message
    console.error(err.cause);           // Original error
  }
}
```

## License

MIT
