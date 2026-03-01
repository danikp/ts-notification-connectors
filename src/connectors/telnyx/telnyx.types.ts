export interface TelnyxSendResponse {
  data: {
    id: string;
    record_type: string;
    direction: string;
    type: string;
    from: { phone_number: string };
    to: { phone_number: string; status: string }[];
    text: string;
  };
}
