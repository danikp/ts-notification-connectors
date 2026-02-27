export interface ApnsPayload {
  aps: {
    alert?: { title?: string; body?: string; subtitle?: string };
    badge?: number;
    sound?: string;
    'thread-id'?: string;
    category?: string;
    'mutable-content'?: number;
    'content-available'?: number;
  };
  [key: string]: unknown;
}

export interface ApnsErrorResponse {
  reason: string;
  timestamp?: number;
}
