# SNS SMS Connector

AWS SNS SMS connector using the Publish API with AWS Signature V4 authentication.

## Config

| Field             | Type     | Required | Description                      |
|-------------------|----------|----------|----------------------------------|
| `region`          | `string` | Yes      | AWS region (e.g., `'us-east-1'`) |
| `accessKeyId`     | `string` | Yes      | AWS access key ID                |
| `secretAccessKey` | `string` | Yes      | AWS secret access key            |

## Features

### Phone Number Format

SNS requires E.164 format for phone numbers (e.g., `+14155550100`). The connector passes `PhoneNumber` directly from `options.to`.

### XML Response Parsing

SNS returns XML responses. The connector extracts `MessageId` from the `<PublishResponse>` XML using lightweight regex parsing (no XML parser dependency).

### Passthrough

Use `_passthrough.body` to add SNS-specific parameters like `MessageAttributes` to the form-encoded request body.

## API

- **Endpoint:** `POST https://sns.{region}.amazonaws.com/`
- **Auth:** AWS Signature V4 via `aws4`
- **Format:** `application/x-www-form-urlencoded`
- **Provider ID:** `sns` (matches `SmsProviderIdEnum.SNS`)
