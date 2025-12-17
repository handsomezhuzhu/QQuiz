/**
 * Mistake List Page (错题本)
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mistakeAPI } from '../api/client'
import Layout from '../components/Layout'
import { XCircle, Loader, Trash2, BookOpen, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuestionTypeText, formatRelativeTime } from '../utils/helpers'

export const MistakeList = () => {
  const [mistakes, setMistakes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [showModeModal, setShowModeModal] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    loadMistakes()
  }, [page, limit])

  const loadMistakes = async () => {
    try {
      setLoading(true)
      const skip = (page - 1) * limit
      const response = await mistakeAPI.getList(skip, limit)
      setMistakes(response.data.mistakes)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to load mistakes:', error)
      toast.error('加载错题本失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (mistakeId) => {
    if (!window.confirm('确定要从错题本中移除这道题吗？')) {
      return
    }

    try {
      await mistakeAPI.remove(mistakeId)
      toast.success('已移除')
      await loadMistakes()
    } catch (error) {
      console.error('Failed to remove mistake:', error)
      toast.error('移除失败')
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">错题本</h1>
            <p className="text-gray-600 mt-1">共 {total} 道错题</p>
          </div>

          {mistakes.length > 0 && (
            <button
              onClick={() => setShowModeModal(true)}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="h-5 w-5" />
              开始刷错题
            </button>
          )}
        </div>

        {/* Empty State */}
        {mistakes.length === 0 ? (
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">错题本是空的</h3>
            <p className="text-gray-500">继续刷题，错题会自动添加到这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mistakes.map((mistake) => {
              const q = mistake.question
              const isExpanded = expandedId === mistake.id

              return (
                <div
                  key={mistake.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Question Preview */}
                  <div
                    className="p-4 md:p-6 cursor-pointer"
                    onClick={() => toggleExpand(mistake.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <XCircle className="h-5 w-5" />
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {getQuestionTypeText(q.type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(mistake.created_at)}
                          </span>
                        </div>

                        <p className={`text-gray-900 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                          {q.content}
                        </p>

                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {/* Options */}
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-2">
                                {q.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700"
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Answer */}
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-sm font-medium text-green-900 mb-1">
                                正确答案
                              </p>
                              <p className="text-sm text-green-700">{q.answer}</p>
                            </div>

                            {/* Analysis */}
                            {q.analysis && (
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-1">
                                  解析
                                </p>
                                <p className="text-sm text-blue-700">{q.analysis}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(mistake.id)
                        }}
                        className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  显示 {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} 共 {total} 条
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="flex items-center px-4 border border-gray-300 rounded-lg bg-white">
                    {page}
                  </span>
                  <button
                    onClick={() => setPage(p => (p * limit < total ? p + 1 : p))}
                    disabled={page * limit >= total}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Limit Selector */}
            <div className="flex justify-end pt-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={10}>10 条/页</option>
                <option value={20}>20 条/页</option>
                <option value={50}>50 条/页</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Mode Selection Modal */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-center">选择刷题模式</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/mistake-quiz?mode=sequential')}
                className="w-full p-4 border-2 border-primary-100 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-between group"
              >
                <div className="text-left">
                  <p className="font-bold text-primary-900">顺序刷题</p>
                  <p className="text-sm text-primary-700">按照加入错题本的时间顺序</p>
                </div>
                <ChevronRight className="h-5 w-5 text-primary-400 group-hover:text-primary-600" />
              </button>

              <button
                onClick={() => navigate('/mistake-quiz?mode=random')}
                className="w-full p-4 border-2 border-purple-100 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors flex items-center justify-between group"
              >
                <div className="text-left">
                  <p className="font-bold text-purple-900">随机刷题</p>
                  <p className="text-sm text-purple-700">打乱顺序进行练习</p>
                </div>
                <ChevronRight className="h-5 w-5 text-purple-400 group-hover:text-purple-600" />
              </button>
            </div>
            <button
              onClick={() => setShowModeModal(false)}
              className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MistakeList
