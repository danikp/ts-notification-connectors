export interface TwilioMessageResponse {
  sid: string;
  status: string;
  date_created: string;
  to: string;
  from: string;
  body: string;
}
