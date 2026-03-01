# D7 Networks SMS Connector

D7 Networks SMS connector using the Messages API v1 with Bearer token authentication.

## Config

| Field      | Type     | Required | Description                 |
|------------|----------|----------|-----------------------------|
| `apiToken` | `string` | Yes      | D7 Networks API token       |
| `from`     | `string` | Yes      | Default sender/originator   |

## Features

### Message Structure

The connector uses D7 Networks' structured payload with `messages` array and `message_globals`. Each message specifies `channel: 'sms'` and `msg_type: 'text'`. The sender is set via `message_globals.originator`.

### Passthrough

Use `_passthrough.body` to add D7 Networks-specific fields like `report_url` or additional entries in the `messages` array.

## API

- **Endpoint:** `POST https://api.d7networks.com/messages/v1/send`
- **Auth:** Bearer token
- **Provider ID:** `d7networks` (matches `SmsProviderIdEnum.D7Networks`)
- **API Reference:** [D7 Networks SMS API](https://d7networks.com/docs/Messages/Send_Message/)
