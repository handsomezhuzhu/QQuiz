/**
 * Mistake List Page (错题本)
 */
import React, { useState, useEffect } from 'react'
import { mistakeAPI } from '../api/client'
import Layout from '../components/Layout'
import { XCircle, Loader, Trash2, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuestionTypeText, formatRelativeTime } from '../utils/helpers'

export const MistakeList = () => {
  const [mistakes, setMistakes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadMistakes()
  }, [])

  const loadMistakes = async () => {
    try {
      const response = await mistakeAPI.getList()
      setMistakes(response.data.mistakes)
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
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">错题本</h1>
          <p className="text-gray-600 mt-1">共 {mistakes.length} 道错题</p>
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
          </div>
        )}
      </div>
    </Layout>
  )
}

export default MistakeList
