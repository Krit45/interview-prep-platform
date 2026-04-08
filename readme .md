# 🤖 Interview Prep Pro

> Crack interviews with confidence using **AI-powered mock interviews, resume analysis, and smart feedback** 🚀

---

## 🌟 Overview

**AI Interview Preparation Pro** is a full-stack web application that simulates real interview environments and helps users prepare effectively using artificial intelligence.

It allows users to:

* Upload resumes 📄
* Practice mock interviews 🎤
* Get AI-generated feedback 📊
* Track performance over time 📈

Perfect for **students, job seekers, and professionals** aiming to improve interview skills.

---

## 🧠 Key Features

### 🎤 Mock Interview Simulation

* HR, Technical, and Coding interviews
* Difficulty levels: Beginner → Advanced

### 📄 Resume Analysis

* Upload PDF resumes
* Extract and analyze content automatically

### 🤖 AI Feedback System

* Evaluate answers
* Provide detailed suggestions
* Score performance

### 📊 Performance Tracking

* Interview history
* Scores & feedback stored in database

### 🎙️ Voice Support

* Microphone-based interaction for real interview feel

---

## 🏗️ Tech Stack

### 💻 Frontend

* React 19
* Vite
* Tailwind CSS
* Framer Motion

### ⚙️ Backend

* Node.js
* Express.js
* Multer (file upload)
* PDF-Parse (resume parsing)

### 🔥 Database & AI

* Firebase (Authentication + Firestore) 
* Google Generative AI (Gemini API)

---

## 📂 Project Structure

```id="kqv1l8"
├── src/                # Frontend (React)
├── server.ts           # Backend API server
├── firebase/           # Firebase config & schema
├── public/             # Static files
├── dist/               # Production build
```

---

## ⚙️ How It Works

1. User uploads resume (PDF)
2. System extracts text using PDF parser
3. User selects interview type & difficulty
4. AI generates questions
5. User answers via text/voice
6. AI evaluates responses and gives feedback

👉 Resume parsing is handled via backend API using `pdf-parse` 

---

## 🚀 Getting Started

### 📌 Prerequisites

* Node.js
* Gemini API Key
* Firebase project

---

### 🔧 Installation

```bash id="p9d2sm"
npm install
```

---

### 🔑 Environment Variables

Create `.env.local` and add:

```id="z9s2af"
GEMINI_API_KEY=your_gemini_api_key
```

(Optional) Firebase config is required for full functionality 

---

### ▶️ Run the App

```bash id="f1q7kc"
npm run dev
```

👉 Runs on: http://localhost:3000 

---

## 📡 API Endpoints

### 📄 Parse Resume

```id="h3k9ds"
POST /api/parse-resume
```

* Accepts PDF file
* Returns extracted text

---

## 🎯 Use Cases

* 🎓 Students preparing for placements
* 💼 Job seekers improving interview skills
* 🧑‍💻 Developers practicing technical interviews
* 🧠 Resume optimization

---

## 🔮 Future Enhancements

* 🧑‍💻 Live coding environment
* 📊 Advanced analytics dashboard
* 🤝 Peer-to-peer mock interviews
* 🌍 Public profile & sharing

---

## 🤝 Contributing

Contributions are welcome!
Fork the repo and submit a PR 🚀

---

## 📜 License

MIT License

---

## 💡 Author

Made with ❤️ by **Kritagya Gupta**

---

## ⭐ Support

If you found this useful:
👉 Star ⭐ the repo
👉 Share with others

---
