# QQuiz Quick Start Guide

## Step 1: Configure (30 seconds)

Double-click to run:
```
setup.bat
```

This will:
- Create `.env` file
- Open it in Notepad
- You need to replace `sk-your-openai-api-key-here` with your real OpenAI API key

**Where to get API key:**
- Visit: https://platform.openai.com/api-keys
- Create new secret key
- Copy and paste into `.env` file

## Step 2: Start Application (3-5 minutes)

Double-click to run:
```
start_app.bat
```

**PostgreSQL Password:**
- When prompted, enter your PostgreSQL password
- Default is usually: `postgres`
- Or just press Enter to try without password

The script will automatically:
- ✓ Check Python and Node.js
- ✓ Create database
- ✓ Install all dependencies
- ✓ Start backend (new window)
- ✓ Start frontend (new window)

## Step 3: Access System

Browser will open automatically: http://localhost:3000

**Login:**
- Username: `admin`
- Password: `admin123`

**Test the system:**
1. Click "题库管理" (Exam Management)
2. Click "创建题库" (Create Exam)
3. Enter name: `Test Exam`
4. Upload file: `test_data/sample_questions.txt`
5. Wait 10-30 seconds for AI to process
6. Click "开始刷题" (Start Quiz)

## What You'll See

✅ Beautiful login page
✅ Dashboard with statistics
✅ Create exam and upload documents
✅ AI processes questions automatically
✅ Quiz player with different question types
✅ Automatic mistake collection
✅ Progress tracking

## Troubleshooting

### Can't find PostgreSQL password
- Try: `postgres` or leave empty
- Or check PostgreSQL installation

### Port already in use
```cmd
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Dependencies install failed
- Check internet connection
- Script uses China mirrors for speed

## Success!

If you see the login page at http://localhost:3000 - congratulations! 🎉

The system is now running. You can:
- Create exam banks
- Upload documents (TXT/PDF/DOCX/XLSX)
- Start quizzing
- Review mistakes
- Track progress

---

Enjoy using QQuiz! 🚀
