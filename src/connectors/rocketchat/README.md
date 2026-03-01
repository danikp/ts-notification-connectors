# Rocket.Chat Chat Connector

Rocket.Chat chat connector using the REST API with token-based authentication.

## Config

| Field       | Type     | Required | Description                                    |
|-------------|----------|----------|------------------------------------------------|
| `serverUrl` | `string` | Yes      | Rocket.Chat server URL (e.g. `https://rc.example.com`) |
| `authToken` | `string` | Yes      | Authentication token (`X-Auth-Token` header)   |
| `userId`    | `string` | Yes      | User ID for authentication (`X-User-Id` header) |
| `roomId`    | `string` | Yes      | Default room ID to send messages to            |

## Features

### Room Resolution
The target room is resolved from `options.channel` first, then falls back to `config.roomId`.

### Success Validation
The connector checks the `success` field in the API response and throws a `ConnectorError` if it is `false`, even on a 200 status code.

### Passthrough
Use `_passthrough.body` to add Rocket.Chat-specific fields to the message object, such as `alias`, `emoji`, `avatar`, or `attachments`.

## API
- **Endpoint:** `{serverUrl}/api/v1/chat.sendMessage`
- **Auth:** `X-Auth-Token` + `X-User-Id` headers
- **Format:** JSON (camelCase)
- **Provider ID:** `rocketchat` (matches `ChatProviderIdEnum.RocketChat`)
- **API Reference:** [Rocket.Chat chat.sendMessage](https://developer.rocket.chat/apidocs/send-message)
