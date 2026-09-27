# SMS4Sats Web

Receive SMS activation codes anonymously. Pay with Bitcoin Lightning. No accounts, no KYC.

Independent integration demo for [sms4sats.com](https://sms4sats.com).

## Features

- Select country (Auto-Select) + service (Telegram, Google, WhatsApp, Discord, ...)
- Live price in sats
- Create receive order → Lightning hold invoice
- QR code + open in wallet + copy invoice
- Auto-poll for payment → number → SMS code
- Cancel order support
- Dark, responsive UI

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Proxied API routes → `https://api2.sms4sats.com`

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Import this repo into [Vercel](https://vercel.com) — zero config.

## API docs

- [sms4sats API docs](https://docs.sms4sats.com)
- [Agent skill (L402)](https://api.sms4sats.com/skill.md)

Not affiliated with sms4sats — demo only.
