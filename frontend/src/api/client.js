/**
 * API Client for QQuiz Backend
 */
import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || 'An error occurred'

    if (error.response?.status === 401) {
      // Unauthorized - Clear token and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
    } else if (error.response?.status === 403) {
      toast.error('Permission denied')
    } else if (error.response?.status === 429) {
      toast.error(message)
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

// ============ Auth APIs ============
export const authAPI = {
  register: (username, password) =>
    api.post('/auth/register', { username, password }),

  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  getCurrentUser: () =>
    api.get('/auth/me'),

  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', null, {
      params: { old_password: oldPassword, new_password: newPassword }
    })
}

// ============ Exam APIs ============
export const examAPI = {
  // Create exam with first document
  create: (title, file) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('file', file)
    return api.post('/exams/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Append document to existing exam
  appendDocument: (examId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/exams/${examId}/append`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Get user's exam list
  getList: (skip = 0, limit = 20) =>
    api.get('/exams/', { params: { skip, limit } }),

  // Get exam detail
  getDetail: (examId) =>
    api.get(`/exams/${examId}`),

  // Delete exam
  delete: (examId) =>
    api.delete(`/exams/${examId}`),

  // Update quiz progress
  updateProgress: (examId, currentIndex) =>
    api.put(`/exams/${examId}/progress`, { current_index: currentIndex })
}

// ============ Question APIs ============
export const questionAPI = {
  // Get all questions for an exam
  getExamQuestions: (examId, skip = 0, limit = 50) =>
    api.get(`/questions/exam/${examId}/questions`, { params: { skip, limit } }),

  // Get current question (based on exam's current_index)
  getCurrentQuestion: (examId) =>
    api.get(`/questions/exam/${examId}/current`),

  // Get question by ID
  getById: (questionId) =>
    api.get(`/questions/${questionId}`),

  // Check answer
  checkAnswer: (questionId, userAnswer) =>
    api.post('/questions/check', {
      question_id: questionId,
      user_answer: userAnswer
    })
}

// ============ Mistake APIs ============
export const mistakeAPI = {
  // Get user's mistake book
  getList: (skip = 0, limit = 50, examId = null) => {
    const params = { skip, limit }
    if (examId) params.exam_id = examId
    return api.get('/mistakes/', { params })
  },

  // Add to mistake book
  add: (questionId) =>
    api.post('/mistakes/add', { question_id: questionId }),

  // Remove from mistake book by mistake ID
  remove: (mistakeId) =>
    api.delete(`/mistakes/${mistakeId}`),

  // Remove from mistake book by question ID
  removeByQuestionId: (questionId) =>
    api.delete(`/mistakes/question/${questionId}`)
}

// ============ Admin APIs ============
export const adminAPI = {
  // Get system config
  getConfig: () =>
    api.get('/admin/config'),

  // Update system config
  updateConfig: (config) =>
    api.put('/admin/config', config)
}

export default api
