/**
 * Parsing Progress Component
 * Displays real-time progress for document parsing
 */
import React from 'react'
import { Loader, CheckCircle, XCircle, FileText, Layers } from 'lucide-react'

export const ParsingProgress = ({ progress }) => {
  if (!progress) return null

  const { status, message, progress: percentage, total_chunks, current_chunk, questions_extracted, questions_added, duplicates_removed } = progress

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <Loader className="h-6 w-6 text-primary-500 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'processing_chunk':
        return 'bg-blue-500'
      default:
        return 'bg-primary-500'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>

        <div className="flex-1">
          {/* Status Message */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {status === 'completed' ? '解析完成' : status === 'failed' ? '解析失败' : '正在解析文档'}
          </h3>
          <p className="text-gray-600 mb-4">{message}</p>

          {/* Progress Bar */}
          {status !== 'completed' && status !== 'failed' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>进度</span>
                <span>{percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 ${getStatusColor()} transition-all duration-300 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {total_chunks > 0 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">文档拆分</span>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  {current_chunk}/{total_chunks}
                </p>
                <p className="text-xs text-blue-600">部分</p>
              </div>
            )}

            {questions_extracted > 0 && (
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">已提取</span>
                </div>
                <p className="text-lg font-bold text-purple-900">{questions_extracted}</p>
                <p className="text-xs text-purple-600">题目</p>
              </div>
            )}

            {questions_added > 0 && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">已添加</span>
                </div>
                <p className="text-lg font-bold text-green-900">{questions_added}</p>
                <p className="text-xs text-green-600">题目</p>
              </div>
            )}

            {duplicates_removed > 0 && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">已去重</span>
                </div>
                <p className="text-lg font-bold text-orange-900">{duplicates_removed}</p>
                <p className="text-xs text-orange-600">题目</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParsingProgress
