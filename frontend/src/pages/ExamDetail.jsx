/**
 * Exam Detail Page - with real-time parsing progress via SSE
 */
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { examAPI, questionAPI } from '../api/client'
import Layout from '../components/Layout'
import ParsingProgress from '../components/ParsingProgress'
import {
  ArrowLeft, Upload, Play, Loader, FileText, AlertCircle, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStatusColor,
  getStatusText,
  formatDate,
  calculateProgress,
  isValidFileType,
  getQuestionTypeText
} from '../utils/helpers'

export const ExamDetail = () => {
  const { examId } = useParams()
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [progress, setProgress] = useState(null)

  const eventSourceRef = useRef(null)

  useEffect(() => {
    loadExamDetail()

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [examId])

  const loadExamDetail = async () => {
    try {
      const [examRes, questionsRes] = await Promise.all([
        examAPI.getDetail(examId),
        questionAPI.getExamQuestions(examId, 0, 10) // Load first 10 for preview
      ])

      setExam(examRes.data)
      setQuestions(questionsRes.data.questions)

      // Connect to SSE if exam is processing
      if (examRes.data.status === 'processing') {
        connectSSE()
      }
    } catch (error) {
      console.error('Failed to load exam:', error)
      toast.error('加载题库失败')
    } finally {
      setLoading(false)
    }
  }

  const connectSSE = () => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log('[SSE] Connecting to progress stream for exam', examId)

    const token = localStorage.getItem('token')
    const url = `/api/exams/${examId}/progress?token=${encodeURIComponent(token)}`

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data)
        console.log('[SSE] Progress update:', progressData)

        setProgress(progressData)

        // Update exam status if completed or failed
        if (progressData.status === 'completed') {
          toast.success(progressData.message)
          setExam(prev => ({ ...prev, status: 'ready' }))
          loadExamDetail() // Reload to get updated questions
          eventSource.close()
          eventSourceRef.current = null
        } else if (progressData.status === 'failed') {
          toast.error(progressData.message)
          setExam(prev => ({ ...prev, status: 'failed' }))
          eventSource.close()
          eventSourceRef.current = null
        }
      } catch (error) {
        console.error('[SSE] Failed to parse progress data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error)
      eventSource.close()
      eventSourceRef.current = null
    }

    eventSource.onopen = () => {
      console.log('[SSE] Connection established')
    }
  }

  const handleAppendDocument = async (e) => {
    e.preventDefault()

    if (!uploadFile) {
      toast.error('请选择文件')
      return
    }

    if (!isValidFileType(uploadFile.name)) {
      toast.error('不支持的文件类型')
      return
    }

    setUploading(true)

    try {
      await examAPI.appendDocument(examId, uploadFile)
      toast.success('文档上传成功，正在解析并去重...')
      setShowUploadModal(false)
      setUploadFile(null)
      setExam(prev => ({ ...prev, status: 'processing' }))

      // Connect to SSE for real-time progress
      connectSSE()
    } catch (error) {
      console.error('Failed to append document:', error)
      toast.error('文档上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleStartQuiz = () => {
    if (exam.current_index >= exam.total_questions) {
      if (window.confirm('已经完成所有题目，是否从头开始？')) {
        navigate(`/quiz/${examId}?reset=true`)
      }
    } else {
      navigate(`/quiz/${examId}`)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!exam) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-600">题库不存在</p>
        </div>
      </Layout>
    )
  }

  const isProcessing = exam.status === 'processing'
  const isReady = exam.status === 'ready'
  const isFailed = exam.status === 'failed'
  const quizProgress = calculateProgress(exam.current_index, exam.total_questions)

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/exams')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          返回题库列表
        </button>

        {/* Parsing Progress (only shown when processing) */}
        {isProcessing && progress && (
          <ParsingProgress progress={progress} />
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {exam.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(exam.status)}`}>
                  {getStatusText(exam.status)}
                </span>
                {isProcessing && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    正在处理中...
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={isProcessing}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="h-5 w-5" />
                添加题目文档
              </button>

              {isReady && exam.total_questions > 0 && (
                <button
                  onClick={handleStartQuiz}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  {exam.current_index > 0 ? '继续刷题' : '开始刷题'}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">题目总数</p>
              <p className="text-2xl font-bold text-gray-900">{exam.total_questions}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">已完成</p>
              <p className="text-2xl font-bold text-primary-600">{exam.current_index}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">剩余</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(0, exam.total_questions - exam.current_index)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">完成度</p>
              <p className="text-2xl font-bold text-green-600">{progress}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          {exam.total_questions > 0 && (
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${quizProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-600">
            <p>创建时间：{formatDate(exam.created_at)}</p>
            <p>最后更新：{formatDate(exam.updated_at)}</p>
          </div>
        </div>

        {/* Failed Status Warning */}
        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 mb-1">文档解析失败</h3>
                <p className="text-sm text-red-700">
                  请检查文档格式是否正确，或尝试重新上传。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Questions Preview */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            题目预览 {questions.length > 0 && `(前 ${questions.length} 题)`}
          </h2>

          {questions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {isProcessing ? '正在解析文档，请稍候...' : '暂无题目'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {getQuestionTypeText(q.type)}
                        </span>
                      </div>
                      <p className="text-gray-900">{q.content}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-gray-600">
                          {q.options.map((opt, i) => (
                            <li key={i}>{opt}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">添加题目文档</h2>
            <p className="text-sm text-gray-600 mb-4">
              上传新文档后，系统会自动解析题目并去除重复题目。
            </p>

            <form onSubmit={handleAppendDocument} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择文档
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  required
                  accept=".txt,.pdf,.doc,.docx,.xlsx,.xls"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持：TXT, PDF, DOC, DOCX, XLSX, XLS
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      上传
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ExamDetail
