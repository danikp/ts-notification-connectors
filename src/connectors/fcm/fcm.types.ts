export interface FcmMessage {
  token?: string;
  topic?: string;
  condition?: string;
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: Record<string, unknown>;
  apns?: Record<string, unknown>;
  fcmOptions?: Record<string, unknown>;
  webpush?: Record<string, unknown>;
}

export interface FcmSendRequest {
  message: FcmMessage;
}

export interface FcmSendResponse {
  name: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
