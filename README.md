# 🚀 Rank Pilot — AI-Powered SEO Analyzer & Rank Tracker

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue)](https://vitejs.dev/)
[![Node](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5-orange)](https://deepmind.google/technologies/gemini/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen)](https://www.mongodb.com/)

**Rank Pilot** is a modern, full-stack SEO audit and rank tracking web application. It combines automated web scraping, Google SERP monitoring, and Google's Gemini AI to deliver actionable SEO audits, performance breakdowns, and competitor positioning insights.

---

## ✨ Features

- 🔍 **AI-Powered Website Auditing:**
  - Fast page scraper measuring load time, page size, meta tags, heading hierarchies, images without alt text, and internal/external link structures.
  - Powered by **Google Gemini** to grade SEO, performance, accessibility, and best practices with a unified 0–100 score.
  - Generates prioritized recommendations (Critical, Warning, Info) and extracts top keyword densities.

- 📈 **Google SERP Rank Tracker:**
  - Track target domain positions across real Google search results for specified keywords.
  - Identify search result pages, position fluctuations, and best recorded positions.
  - Live competitor breakdown with SERP titles, URLs, and snippet previews.

- 📊 **Interactive Dashboard & History:**
  - Track scan statistics, daily scan quotas, and recent analysis history.
  - Search, filter by status (`completed`, `processing`, `failed`), and sort past reports.

- 🔒 **Secure Authentication & Plan Limits:**
  - JWT-based authentication with bcrypt password encryption.
  - Built-in plan limits (e.g., Free vs. Pro tier daily quotas).

- 🎨 **Modern Dark/Light UI:**
  - Built with Tailwind CSS v4, Lucide icons, glassmorphism aesthetics, dynamic SVG score gauges, and responsive layouts.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + Vanilla CSS Design Tokens
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Feedback:** React Hot Toast

### **Backend**
- **Runtime:** Node.js (ES Modules)
- **Server:** Express 5
- **Database:** MongoDB Atlas via Mongoose 9
- **Scraping & Parsing:** Axios + Cheerio
- **AI Engine:** Google Generative AI (`gemini-2.5-flash`)
- **Security:** JSON Web Tokens (`jsonwebtoken`) + `bcrypt`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A MongoDB database (local or MongoDB Atlas connection string)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

---

### Installation & Setup

#### 1. Clone the repository
```bash
git clone https://github.com/your-username/seo-rank-tracker.git
cd seo-rank-tracker
