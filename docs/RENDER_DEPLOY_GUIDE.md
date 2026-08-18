# 🚀 Deploying AI Quant Trader on Render (Step-by-Step Guide)

Render is great for running persistent Node.js services. Here is how to set it up when importing your repository into Render:

---

## 📋 Step 1: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → select **Web Service**.
3. Connect your GitHub repository (`Aitrader`) and click **Connect**.

---

## ⚙️ Step 2: Configure Service Settings

Fill in the settings as follows:

| Field | Value |
| :--- | :--- |
| **Name** | `aitrader` (or your preferred name) |
| **Region** | Choose nearest (e.g. `Oregon (US West)` or `Frankfurt (EU)`) |
| **Branch** | `main` |
| **Root Directory** | Leave empty (default) |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Instance Type** | `Free` (or `Starter`) |

---

## 🔑 Step 3: Add Environment Variables

Scroll down to the **Environment Variables** section and add the following keys:

| Environment Variable Key | Description | Example Value |
| :--- | :--- | :--- |
| `NODE_VERSION` | Node.js engine version | `20` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Public Anon Key | `eyJhbGciOi...` |
| `SUPABASE_URL` | Your Supabase Project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase Public Anon Key | `eyJhbGciOi...` |
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot Token | `7182938491:AAHk...` |
| `TELEGRAM_CHAT_ID` | Your Telegram Chat ID | `987654321` |

*(Optional for Live Broker)*:
- `ALPACA_API_KEY`: Your Alpaca Key ID
- `ALPACA_SECRET_KEY`: Your Alpaca Secret Key

---

## 🚀 Step 4: Click Deploy & Access Your Live App

1. Click **Create Web Service**.
2. Render will automatically pull the code, install dependencies, build the Next.js production bundle, and start the service.
3. Once the build finishes, Render will provide your live URL (e.g. `https://aitrader.onrender.com`).

---

## 📱 Step 5: Activate Interactive Telegram Webhook

Once your app is live on Render, link your Telegram bot to your live Render domain:

1. Open your browser and visit:
   ```text
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_RENDER_APP_NAME>.onrender.com/api/notifications/telegram/webhook
   ```
2. You will see:
   ```json
   { "ok": true, "result": true, "description": "Webhook was set" }
   ```
3. Open Telegram and send `/status` to your bot — you will get an instant live response from your Render deployment!
