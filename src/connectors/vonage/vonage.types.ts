export interface VonageSmsResponse {
  'message-count': string;
  messages: Array<{
    'message-id': string;
    status: string;
    'error-text'?: string;
    to: string;
    'remaining-balance'?: string;
    'message-price'?: string;
    'network'?: string;
  }>;
}
