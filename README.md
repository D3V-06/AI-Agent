# International Student Deadline & Risk Agent (AI-Agent)

An AI-driven academic compliance, deadline tracking, and risk assessment assistant connected to n8n workflow automation.

## Features

- **Conversational AI Agent**: Real-time academic assistance, deadline tracking, and student risk evaluation.
- **n8n Webhook Integration**: Seamlessly communicates with an automated n8n workflow backend.
- **Interactive Chat Interface**: Includes markdown rendering, code syntax highlighting, conversation management, and quick prompt suggestions.
- **Responsive & Modern Design**: Built with modern typography, glassmorphism UI touches, and mobile responsiveness.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Build Tool**: Vite
- **Markdown & Highlight**: `marked`, `highlight.js`, `dompurify`
- **Automation / Workflow**: n8n Webhook integration

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your `VITE_N8N_WEBHOOK_URL` to your active n8n webhook endpoint:
```env
VITE_N8N_WEBHOOK_URL=https://<your-instance>.app.n8n.cloud/webhook/student-risk-chat
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```
