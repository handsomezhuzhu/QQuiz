/**
 * Exam List Page
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { examAPI } from '../api/client'
import Layout from '../components/Layout'
import {
  Plus, FolderOpen, Loader, AlertCircle, Trash2, Upload
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStatusColor,
  getStatusText,
  formatRelativeTime,
  calculateProgress,
  isValidFileType
} from '../utils/helpers'

export const ExamList = () => {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pollInterval, setPollInterval] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    file: null,
    isRandom: false
  })

  useEffect(() => {
    loadExams()

    // Start polling for processing exams
    const interval = setInterval(() => {
      checkProcessingExams()
    }, 3000) // Poll every 3 seconds

    setPollInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const loadExams = async () => {
    try {
      const response = await examAPI.getList()
      setExams(response.data.exams)
    } catch (error) {
      console.error('Failed to load exams:', error)
      toast.error('加载题库失败')
    } finally {
      setLoading(false)
    }
  }

  const checkProcessingExams = async () => {
    try {
      const response = await examAPI.getList()
      const newExams = response.data.exams

      // Check if any processing exam is now ready
      const oldProcessing = exams.filter(e => e.status === 'processing')
      const newReady = newExams.filter(e =>
        oldProcessing.some(old => old.id === e.id && e.status === 'ready')
      )

      if (newReady.length > 0) {
        toast.success(`${newReady.length} 个题库解析完成！`)
      }

      setExams(newExams)
    } catch (error) {
      console.error('Failed to poll exams:', error)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()

    if (!formData.file) {
      toast.error('请选择文件')
      return
    }

    if (!isValidFileType(formData.file.name)) {
      toast.error('不支持的文件类型')
      return
    }

    setCreating(true)

    try {
      const response = await examAPI.create(formData.title, formData.file, formData.isRandom)
      toast.success('题库创建成功，正在解析文档...')
      setShowCreateModal(false)
      setFormData({ title: '', file: null, isRandom: false })

      // 跳转到新创建的试卷详情页
      if (response.data && response.data.exam_id) {
        navigate(`/exams/${response.data.exam_id}`)
      } else {
        // 如果没有返回 exam_id，刷新列表
        await loadExams()
      }
    } catch (error) {
      console.error('Failed to create exam:', error)
      toast.error('创建失败：' + (error.response?.data?.detail || error.message))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (examId) => {
    if (!window.confirm('确定要删除这个题库吗？删除后无法恢复。')) {
      return
    }

    try {
      await examAPI.delete(examId)
      toast.success('题库已删除')
      await loadExams()
    } catch (error) {
      console.error('Failed to delete exam:', error)
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

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">题库管理</h1>
            <p className="text-gray-600 mt-1">共 {exams.length} 个题库</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 md:mt-0 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 justify-center"
          >
            <Plus className="h-5 w-5" />
            创建题库
          </button>
        </div>

        {/* Exam Grid */}
        {exams.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有题库</h3>
            <p className="text-gray-500 mb-6">创建第一个题库开始刷题吧！</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              创建题库
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                    {exam.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exam.status)}`}>
                    {getStatusText(exam.status)}
                  </span>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">题目数量</span>
                    <span className="font-medium">{exam.total_questions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">已完成</span>
                    <span className="font-medium">
                      {exam.current_index} / {exam.total_questions}
                    </span>
                  </div>
                  {exam.total_questions > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${calculateProgress(exam.current_index, exam.total_questions)}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Time */}
                <p className="text-xs text-gray-500 mb-4">
                  创建于 {formatRelativeTime(exam.created_at)}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/exams/${exam.id}`)}
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">创建新题库</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题库名称
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="例如：数据结构期末复习"
                />
              </div>

              {/* File */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传文档
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                  required
                  accept=".txt,.pdf,.doc,.docx,.xlsx,.xls"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持：TXT, PDF, DOC, DOCX, XLSX, XLS
                </p>
              </div>

              {/* Order Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目顺序
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.isRandom}
                      onChange={() => setFormData({ ...formData, isRandom: false })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">顺序（按文档原序）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.isRandom}
                      onChange={() => setFormData({ ...formData, isRandom: true })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">乱序（随机打乱）</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  注意：创建后题目顺序将固定，无法再次更改。
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowCreateModal(false)
                    setFormData({ title: '', file: null, isRandom: false })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建'
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

export default ExamList
