# Twilio SMS Connector

Twilio SMS connector using the Messages API with HTTP Basic authentication.

## Config

| Field        | Type     | Required | Description                        |
|--------------|----------|----------|------------------------------------|
| `accountSid` | `string` | Yes      | Twilio Account SID (`ACxxxxxxx`)   |
| `authToken`  | `string` | Yes      | Twilio Auth Token                  |
| `from`       | `string` | Yes      | Default sender phone number        |

## Features

### Phone Number Format

Twilio expects E.164 format (e.g., `+14155551234`). The connector passes `To` and `From` directly from options/config.

### Passthrough

Use `_passthrough.body` to add Twilio-specific fields like `StatusCallback` or `MessagingServiceSid`.

## API

- **Endpoint:** `POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`
- **Auth:** HTTP Basic (`AccountSid:AuthToken`)
- **Format:** `application/x-www-form-urlencoded`
- **Response:** JSON (via `.json` suffix on URL)
- **Provider ID:** `twilio` (matches `SmsProviderIdEnum.Twilio`)
