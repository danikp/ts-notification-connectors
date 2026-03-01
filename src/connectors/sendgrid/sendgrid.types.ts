export interface SendgridPersonalization {
  to: { email: string }[];
  cc?: { email: string }[];
  bcc?: { email: string }[];
  subject: string;
}

export interface SendgridAttachment {
  content: string;
  type: string;
  filename: string;
  disposition?: string;
}

export interface SendgridRequestBody {
  personalizations: SendgridPersonalization[];
  from: { email: string; name?: string };
  reply_to?: { email: string };
  content: { type: string; value: string }[];
  attachments?: SendgridAttachment[];
}
