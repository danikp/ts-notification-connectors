# Infobip SMS Connector

Infobip SMS connector using the SMS API v3 with `App` prefix API key authentication.

## Config

| Field     | Type     | Required | Description                                      |
|-----------|----------|----------|--------------------------------------------------|
| `apiKey`  | `string` | Yes      | Infobip API key                                  |
| `baseUrl` | `string` | Yes      | Infobip base URL (e.g., `xxxxx.api.infobip.com`) |
| `from`    | `string` | Yes      | Default sender phone number or alphanumeric ID   |

## Features

### Custom Base URL

Infobip assigns a unique base URL per account. The connector builds the endpoint as `https://{baseUrl}/sms/3/messages`.

### Message Wrapping

The connector wraps each message in a `messages` array with `destinations` sub-array, matching Infobip's bulk-capable API structure.

### Passthrough

Use `_passthrough.body` to add Infobip-specific fields like `notifyUrl`, `notifyContentType`, or `validityPeriod`.

## API

- **Endpoint:** `POST https://{baseUrl}/sms/3/messages`
- **Auth:** `App` prefix (`Authorization: App {apiKey}`)
- **Provider ID:** `infobip` (matches `SmsProviderIdEnum.Infobip`)
- **API Reference:** [Infobip SMS API](https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-message)
