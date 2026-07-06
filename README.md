# CleanBiz Assistant 🧹

AI-powered lead capture and booking assistant for residential/commercial cleaning businesses.

## 🚀 Quick Start

### 1. Supabase Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase-schema.sql` in the SQL Editor
3. Copy your project URL and anon key

### 2. Environment Variables
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### 5. Connect GitHub
```bash
git remote add origin https://github.com/YOUR_USER/cleanbiz-assistant.git
git push -u origin main
```

## 🧩 Features

| Feature | Status |
|---------|--------|
| Lead Capture Chat Widget | ✅ |
| Smart Qualification Logic | ✅ |
| CRM Dashboard | ✅ |
| Missed Call Text-Back (Twilio) | 🔧 Configure in Settings |
| Google Calendar Sync | 🔧 Configure in Settings |
| Automated Follow-ups | 🔧 Configure in Settings |
| Review Generation | 🔧 Configure in Settings |
| Booking Calendar | ✅ |
| Setup Wizard | ✅ |
| Mobile-First UI | ✅ |
| Industry Customization | ✅ |

## 🏗️ Tech Stack
- **Frontend:** React + Vite
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **SMS:** Twilio
- **Calendar:** Google Calendar API
- **Auth:** Supabase Auth