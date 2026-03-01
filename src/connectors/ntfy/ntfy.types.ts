export interface NtfySendResponse {
  id: string;
  time: number;
  expires: number;
  event: string;
  topic: string;
  message: string;
  title?: string;
}
