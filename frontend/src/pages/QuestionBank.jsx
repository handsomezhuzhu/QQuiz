/**
 * Question Bank Page - View all questions
 */
import React, { useState, useEffect } from 'react'
import { questionAPI } from '../api/client'
import Pagination from '../components/Pagination'
import { FileText, Loader, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuestionTypeText, formatRelativeTime } from '../utils/helpers'

export const QuestionBank = () => {
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        loadQuestions()
    }, [page, limit])

    const loadQuestions = async () => {
        try {
            setLoading(true)
            const skip = (page - 1) * limit
            const response = await questionAPI.getAll(skip, limit)
            setQuestions(response.data.questions)
            setTotal(response.data.total)
        } catch (error) {
            console.error('Failed to load questions:', error)
            toast.error('加载题库失败')
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id)
    }

    if (loading && questions.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        )
    }

    return (
        <>
            <div className="p-4 md:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">全站题库</h1>
                    <p className="text-gray-600 mt-1">共 {total} 道题目</p>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {questions.map((q) => {
                        const isExpanded = expandedId === q.id

                        return (
                            <div
                                key={q.id}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div
                                    className="p-4 md:p-6 cursor-pointer"
                                    onClick={() => toggleExpand(q.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                            <FileText className="h-5 w-5" />
                                        </span>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                    {getQuestionTypeText(q.type)}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ID: {q.id}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatRelativeTime(q.created_at)}
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
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={page}
                    totalItems={total}
                    pageSize={limit}
                    onPageChange={setPage}
                    onPageSizeChange={(newLimit) => {
                        setLimit(newLimit)
                        setPage(1)
                    }}
                />
            </div>
        </>
    )
}

export default QuestionBank
