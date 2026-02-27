# Telegram Chat Connector

Telegram chat connector using the Bot API with token-based authentication.

## Config

| Field      | Type     | Required | Description              |
|------------|----------|----------|--------------------------|
| `botToken` | `string` | Yes      | Telegram Bot API token   |

## Features

### HTML Parse Mode
Messages are sent with `parse_mode: 'HTML'` by default. Override via `_passthrough.body`.

### Passthrough
Use `_passthrough.body` to add Telegram-specific fields like `disable_notification`, `reply_to_message_id`, `reply_markup`, or override `parse_mode`.

## API
- **Endpoint:** `POST https://api.telegram.org/bot{token}/sendMessage`
- **Auth:** Bot token in URL path
- **Format:** JSON
- **Provider ID:** `telegram` (matches `ChatProviderIdEnum.Telegram`)
