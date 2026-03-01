# LINE Chat Connector

LINE chat connector using the Messaging API with Bearer token authentication.

## Config

| Field                | Type     | Required | Description                          |
|----------------------|----------|----------|--------------------------------------|
| `channelAccessToken` | `string` | Yes      | LINE channel access token            |

## Features

### Push Messaging
Messages are sent via the push message endpoint, which requires `options.channel` to specify the target user, group, or room ID.

### Passthrough
Use `_passthrough.body` to add LINE-specific fields like additional message objects (images, stickers, flex messages) in the `messages` array, or `notificationDisabled`.

## API
- **Endpoint:** `https://api.line.me/v2/bot/message/push`
- **Auth:** Bearer token (`channelAccessToken`)
- **Format:** JSON (camelCase)
- **Provider ID:** `line` (matches `ChatProviderIdEnum.LINE`)
- **API Reference:** [LINE Messaging API - Push Message](https://developers.line.biz/en/reference/messaging-api/#send-push-message)
