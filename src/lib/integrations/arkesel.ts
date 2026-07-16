import { readEnv } from "@/lib/env";

export type SmsMessage = {
  to: string;
  message: string;
  sender?: string;
};

export async function sendSms({ to, message, sender = "Ember" }: SmsMessage) {
  const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: {
      "api-key": readEnv("ARKESEL_API_KEY"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sender,
      message,
      recipients: [to]
    })
  });

  if (!response.ok) {
    throw new Error(`Arkesel SMS failed with status ${response.status}`);
  }

  return response.json();
}
