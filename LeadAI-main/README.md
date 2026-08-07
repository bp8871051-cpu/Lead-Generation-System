# LeadAI

AI-Powered Lead Generation & Cold Outreach Platform for Modern Agencies.

## Architecture
- **Frontend**: Next.js 15 (React 19), Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python), SQLite/PostgreSQL
- **Design System**: Glassmorphism, Tailwind, Custom SVGs

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 2. Environment Variables
Create a `.env` file in the `/backend` directory:
```env
PROJECT_NAME="LeadAI API"
SECRET_KEY="your-secret-key"
DATABASE_URL="sqlite:///./leadai.db"
GOOGLE_PLACES_API_KEY="your-google-places-key"
OPENAI_API_KEY="your-openai-key"
MOCK_MODE="False"
```

### 3. Quick Start (Windows)
Simply run the included batch script to start both the frontend and backend simultaneously:
```cmd
run_all.bat
```

Or manually:
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload```

## Features
- AI-Powered Map Scanning
- Automated SWOT Analysis via OpenAI
- Built-in CRM Pipeline
- Direct SMTP Cold Emailing
- Beautiful Analytics Dashboard
