# Student Deadline & Risk Agent

Academic compliance, deadline tracking, and student risk assessment assistant connected to n8n workflow automation.

## Features

- **n8n Webhook Integration**: Sends user queries and session state directly to your n8n workflow endpoint.
- **Conversation Management**: Searchable multi-conversation sidebar, message history persistence, and Markdown export.
- **Rich Markdown & Code Support**: Renders tables, lists, and syntax-highlighted code blocks via `marked`, `highlight.js`, and `dompurify`.
- **Mobile-First Responsive Layout**: Optimized for mobile, tablet, and desktop viewports with safe-area support and non-overlapping controls.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Build Tool**: Vite
- **Dependencies**: `marked`, `highlight.js`, `dompurify`
- **Backend**: n8n Webhook workflow

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

Set `VITE_N8N_WEBHOOK_URL` to your active n8n webhook endpoint:

```env
VITE_N8N_WEBHOOK_URL=https://ahmad12365443.app.n8n.cloud/webhook/student-risk-chat
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```
