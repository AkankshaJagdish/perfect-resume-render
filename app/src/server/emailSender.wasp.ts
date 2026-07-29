import { type EmailSender } from "@wasp.sh/spec";

export const emailSender: EmailSender = {
  provider: "SMTP",
  defaultFrom: {
    name: "PerfectResume",
    email: "me@example.com",
  },
};
