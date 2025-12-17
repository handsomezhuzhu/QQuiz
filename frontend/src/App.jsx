import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'

// Auth Pages
import Login from './pages/Login'
import Register from './pages/Register'

// Main Pages
import Dashboard from './pages/Dashboard'
import ExamList from './pages/ExamList'
import ExamDetail from './pages/ExamDetail'
import QuizPlayer from './pages/QuizPlayer'
import MistakeList from './pages/MistakeList'
import MistakePlayer from './pages/MistakePlayer'
import QuestionBank from './pages/QuestionBank'

// Admin Pages
import AdminPanel from './pages/AdminPanel'
import AdminSettings from './pages/AdminSettings'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes with Layout */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/exams" element={<ExamList />} />
              <Route path="/exams/:examId" element={<ExamDetail />} />
              <Route path="/quiz/:examId" element={<QuizPlayer />} />
              <Route path="/mistakes" element={<MistakeList />} />
              <Route path="/mistake-quiz" element={<MistakePlayer />} />
              <Route path="/questions" element={<QuestionBank />} />

              {/* Admin Only Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
