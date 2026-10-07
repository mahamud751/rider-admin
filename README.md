# Rider Admin Dashboard

Next.js 16.3.8 operations dashboard for the Rider backend.

1. Copy `.env.example` to `.env.local` and set the API URL (Rider defaults to port 3002).
2. Run `npm install` and `npm run dev` (the dashboard uses port 3001).
3. Sign in with an existing admin email/password account.

The phone-call switch requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` on the server. Calls remain disabled by default.
