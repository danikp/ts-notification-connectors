# Telnyx SMS Connector

Telnyx SMS connector using the Messages API with Bearer token authentication.

## Config

| Field    | Type     | Required | Description                 |
|----------|----------|----------|-----------------------------|
| `apiKey` | `string` | Yes      | Telnyx API key              |
| `from`   | `string` | Yes      | Default sender phone number |

## Features

### Passthrough

Use `_passthrough.body` to add Telnyx-specific fields like `messaging_profile_id` or `webhook_url`.

## API

- **Endpoint:** `POST https://api.telnyx.com/v2/messages`
- **Auth:** Bearer token
- **Provider ID:** `telnyx` (matches `SmsProviderIdEnum.Telnyx`)
- **API Reference:** [Telnyx Messaging API](https://developers.telnyx.com/api/messaging/send-message)
