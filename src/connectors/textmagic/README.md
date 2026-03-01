# Textmagic SMS Connector

Textmagic SMS connector using the Messages API v2 with username + API key header authentication.

## Config

| Field      | Type     | Required | Description                 |
|------------|----------|----------|-----------------------------|
| `username` | `string` | Yes      | Textmagic account username  |
| `apiKey`   | `string` | Yes      | Textmagic API key           |
| `from`     | `string` | No       | Default sender phone number or ID |

## Features

### Optional Sender

The `from` field is optional. When omitted, Textmagic uses a shared number or your account default.

### Phone Field

The recipient phone number is sent as the `phones` field (not `to`) in the API payload.

### Passthrough

Use `_passthrough.body` to add Textmagic-specific fields like `sendingDateTime`, `contacts`, or `templateId`.

## API

- **Endpoint:** `POST https://rest.textmagic.com/api/v2/messages`
- **Auth:** Custom headers (`X-TM-Username` + `X-TM-Key`)
- **Provider ID:** `textmagic` (matches `SmsProviderIdEnum.Textmagic`)
- **API Reference:** [Textmagic SMS API](https://www.textmagic.com/docs/api/sms/send-sms/)
