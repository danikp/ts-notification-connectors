# MessageBird SMS Connector

MessageBird SMS connector using the Messages API with `AccessKey` prefix authentication.

## Config

| Field       | Type     | Required | Description                 |
|-------------|----------|----------|-----------------------------|
| `accessKey` | `string` | Yes      | MessageBird access key      |
| `from`      | `string` | Yes      | Default sender name or number (called `originator` in the API) |

## Features

### Originator Field

The sender is sent as `originator` in the API payload. The connector maps `from` (from options or config) to this field.

### Passthrough

Use `_passthrough.body` to add MessageBird-specific fields like `scheduledDatetime`, `reference`, or `reportUrl`.

## API

- **Endpoint:** `POST https://rest.messagebird.com/messages`
- **Auth:** `AccessKey` prefix (`Authorization: AccessKey {accessKey}`)
- **Provider ID:** `messagebird` (matches `SmsProviderIdEnum.MessageBird`)
- **API Reference:** [MessageBird SMS API](https://developers.messagebird.com/api/sms-messaging/#send-outbound-sms)
