export enum EmailProviderIdEnum {
  SES = 'ses',
  Resend = 'resend',
  Mailgun = 'mailgun',
  Sendgrid = 'sendgrid',
  Postmark = 'postmark',
  MailerSend = 'mailersend',
  Mailtrap = 'mailtrap',
  Brevo = 'brevo',
  SparkPost = 'sparkpost',
}

export enum SmsProviderIdEnum {
  Nexmo = 'nexmo',
  Twilio = 'twilio',
  Plivo = 'plivo',
  SNS = 'sns',
  Sinch = 'sinch',
  Telnyx = 'telnyx',
  Infobip = 'infobip',
  MessageBird = 'messagebird',
  Textmagic = 'textmagic',
  D7Networks = 'd7networks',
}

export enum PushProviderIdEnum {
  FCM = 'fcm',
  EXPO = 'expo',
  APNS = 'apns',
  OneSignal = 'one-signal',
  Pushover = 'pushover',
  PusherBeams = 'pusher-beams',
  Ntfy = 'ntfy',
  Pushbullet = 'pushbullet',
  WonderPush = 'wonderpush',
}

export enum ChatProviderIdEnum {
  Telegram = 'telegram',
  Slack = 'slack',
  WhatsAppBusiness = 'whatsapp-business',
  Discord = 'discord',
  MsTeams = 'msteams',
  GoogleChat = 'google-chat',
  Mattermost = 'mattermost',
  RocketChat = 'rocketchat',
  LINE = 'line',
}
