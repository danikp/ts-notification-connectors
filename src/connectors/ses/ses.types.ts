export interface SesV2SendEmailRequest {
  FromEmailAddress: string;
  Destination: {
    ToAddresses: string[];
    CcAddresses?: string[];
    BccAddresses?: string[];
  };
  ReplyToAddresses?: string[];
  Content:
    | {
        Simple: {
          Subject: { Data: string; Charset?: string };
          Body: {
            Html?: { Data: string; Charset?: string };
            Text?: { Data: string; Charset?: string };
          };
        };
      }
    | {
        Raw: {
          Data: string; // base64-encoded MIME
        };
      };
  EmailTags?: Array<{ Name: string; Value: string }>;
  ConfigurationSetName?: string;
}

export interface SesV2SendEmailResponse {
  MessageId: string;
}
