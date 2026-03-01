# Pusher Beams Push Connector

Pusher Beams push connector using secret key Bearer authentication with user-targeted delivery.

## Config

| Field        | Type     | Required | Description                    |
|--------------|----------|----------|--------------------------------|
| `instanceId` | `string` | Yes      | Pusher Beams instance ID       |
| `secretKey`  | `string` | Yes      | Pusher Beams secret key        |

## Features

### Cross-Platform Payload

The connector builds platform-specific notification blocks for FCM, APNs, and web in a single request. All three platforms receive the same title and body.

### Native Multi-User Delivery

Target user IDs are sent as a `users` array in a single API call. Pusher Beams handles fan-out server-side.

### Passthrough

Use `_passthrough.body` to add platform-specific overrides to the `fcm`, `apns`, or `web` blocks, or to include additional Beams fields like `interests`.

## API

- **Endpoint:** `POST https://{instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/{instanceId}/publishes/users`
- **Auth:** Bearer token (secret key)
- **Provider ID:** `pusher-beams` (matches `PushProviderIdEnum.PUSHER_BEAMS`)
- **API Reference:** [Pusher Beams Publish API](https://pusher.com/docs/beams/reference/publish-api/)
