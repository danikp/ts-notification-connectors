export interface SinchSendResponse {
  id: string;
  to: string[];
  from: string;
  body: string;
  type: string;
  created_at: string;
  modified_at: string;
}
