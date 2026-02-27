export enum EmailProviderIdEnum {
  SES = 'ses',
  Resend = 'resend',
  Mailgun = 'mailgun',
}

export enum SmsProviderIdEnum {
  Nexmo = 'nexmo',
  Twilio = 'twilio',
  Plivo = 'plivo',
  SNS = 'sns',
}

export enum PushProviderIdEnum {
  FCM = 'fcm',
  EXPO = 'expo',
  APNS = 'apns',
}

export enum ChatProviderIdEnum {
  Telegram = 'telegram',
  Slack = 'slack',
  WhatsAppBusiness = 'whatsapp-business',
}
