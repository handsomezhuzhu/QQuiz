/**
 * Mistake Player Page - Re-do wrong questions
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { mistakeAPI, questionAPI } from '../api/client'
import {
    ArrowLeft, ArrowRight, Check, X, Loader, Trash2, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuestionTypeText } from '../utils/helpers'

export const MistakePlayer = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const mode = searchParams.get('mode') || 'sequential'

    console.log('MistakePlayer mounted, mode:', mode)

    const [loading, setLoading] = useState(true)
    const [mistake, setMistake] = useState(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [total, setTotal] = useState(0)
    const [randomMistakes, setRandomMistakes] = useState([]) // Store full mistake objects

    const [submitting, setSubmitting] = useState(false)
    const [userAnswer, setUserAnswer] = useState('')
    const [multipleAnswers, setMultipleAnswers] = useState([])
    const [result, setResult] = useState(null)

    useEffect(() => {
        loadMistake()
    }, [currentIndex, mode])

    const loadMistake = async () => {
        try {
            setLoading(true)

            let currentMistake = null

            if (mode === 'random') {
                // Random Mode Logic
                if (randomMistakes.length === 0) {
                    // First load: fetch all mistakes
                    const response = await mistakeAPI.getList(0, 1000)
                    const allMistakes = response.data.mistakes
                    setTotal(response.data.total)

                    if (allMistakes.length > 0) {
                        // Shuffle mistakes
                        const shuffled = [...allMistakes]
                        for (let i = shuffled.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        }
                        setRandomMistakes(shuffled)
                        currentMistake = shuffled[0]
                    }
                } else {
                    // Subsequent loads: use stored mistakes
                    if (currentIndex < randomMistakes.length) {
                        currentMistake = randomMistakes[currentIndex]
                    }
                }
            } else {
                // Sequential Mode Logic
                const response = await mistakeAPI.getList(currentIndex, 1)
                setTotal(response.data.total)
                if (response.data.mistakes.length > 0) {
                    currentMistake = response.data.mistakes[0]
                }
            }

            if (currentMistake) {
                // Ensure options exist for judge type
                if (currentMistake.question.type === 'judge' && (!currentMistake.question.options || currentMistake.question.options.length === 0)) {
                    currentMistake.question.options = ['A. 正确', 'B. 错误']
                }
                setMistake(currentMistake)
                console.log('Mistake loaded:', currentMistake)
                setResult(null)
                setUserAnswer('')
                setMultipleAnswers([])
            } else {
                setMistake(null)
            }
        } catch (error) {
            console.error('Failed to load mistake:', error)
            toast.error('加载错题失败')
        } finally {
            setLoading(false)
            console.log('Loading finished')
        }
    }

    const handleSubmitAnswer = async () => {
        let answer = userAnswer

        if (mistake.question.type === 'multiple') {
            if (multipleAnswers.length === 0) {
                toast.error('请至少选择一个选项')
                return
            }
            answer = multipleAnswers.sort().join('')
        }

        if (!answer.trim()) {
            toast.error('请输入答案')
            return
        }

        setSubmitting(true)

        try {
            const response = await questionAPI.checkAnswer(mistake.question.id, answer)
            setResult(response.data)

            if (response.data.correct) {
                toast.success('回答正确！')
            } else {
                toast.error('回答错误')
            }
        } catch (error) {
            console.error('Failed to check answer:', error)
            toast.error('提交答案失败')
        } finally {
            setSubmitting(false)
        }
    }

    const handleNext = () => {
        if (currentIndex < total - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            toast.success('已完成所有错题！')
            navigate('/mistakes')
        }
    }

    const handleRemove = async () => {
        if (!window.confirm('确定要从错题本中移除这道题吗？')) {
            return
        }
        try {
            await mistakeAPI.remove(mistake.id)
            toast.success('已移除')
            // Reload current index (which will now be the next item or empty)
            // If we remove the last item, we need to go back one step or show empty
            if (mode === 'random') {
                // Remove from random list
                const newRandomList = randomMistakes.filter(m => m.id !== mistake.id)
                setRandomMistakes(newRandomList)
                setTotal(newRandomList.length)

                if (currentIndex >= newRandomList.length && newRandomList.length > 0) {
                    setCurrentIndex(prev => prev - 1)
                } else if (newRandomList.length === 0) {
                    setMistake(null)
                } else {
                    // Force reload with new list
                    const nextMistake = newRandomList[currentIndex]
                    if (nextMistake.question.type === 'judge' && (!nextMistake.question.options || nextMistake.question.options.length === 0)) {
                        nextMistake.question.options = ['A. 正确', 'B. 错误']
                    }
                    setMistake(nextMistake)
                    setResult(null)
                    setUserAnswer('')
                    setMultipleAnswers([])
                }
            } else {
                if (currentIndex >= total - 1 && total > 1) {
                    setCurrentIndex(prev => prev - 1)
                } else {
                    loadMistake()
                }
            }
        } catch (error) {
            console.error('Failed to remove mistake:', error)
            toast.error('移除失败')
        }
    }

    const handleMultipleChoice = (option) => {
        const letter = option.charAt(0)
        if (multipleAnswers.includes(letter)) {
            setMultipleAnswers(multipleAnswers.filter(a => a !== letter))
        } else {
            setMultipleAnswers([...multipleAnswers, letter])
        }
    }

    if (loading && !mistake) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        )
    }

    if (!mistake) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-600">错题本为空</p>
                <button
                    onClick={() => navigate('/mistakes')}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                    返回错题列表
                </button>
            </div>
        )
    }

    const question = mistake.question

    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <AlertCircle className="h-16 w-16 text-red-300 mb-4" />
                <p className="text-gray-600">题目数据缺失</p>
                <button
                    onClick={() => navigate('/mistakes')}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                    返回错题列表
                </button>
            </div>
        )
    }

    return (
        <>
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate('/mistakes')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        返回错题列表
                    </button>

                    <div className="text-sm text-gray-600">
                        进度: {currentIndex + 1} / {total}
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-white rounded-xl shadow-md p-6 md:p-8 mb-6">
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                                {currentIndex + 1}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                                {getQuestionTypeText(question.type)}
                            </span>
                        </div>

                        <button
                            onClick={handleRemove}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                            <span className="hidden sm:inline">移除此题</span>
                        </button>
                    </div>

                    {/* Question Content */}
                    <div className="mb-6">
                        <p className="text-lg md:text-xl text-gray-900 leading-relaxed">
                            {question.content}
                        </p>
                    </div>

                    {/* Options */}
                    {question.options && question.options.length > 0 && (
                        <div className="space-y-3 mb-6">
                            {question.options.map((option, index) => {
                                const letter = option.charAt(0)
                                const isSelected = question.type === 'multiple'
                                    ? multipleAnswers.includes(letter)
                                    : userAnswer === letter

                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (!result) {
                                                if (question.type === 'multiple') {
                                                    handleMultipleChoice(option)
                                                } else {
                                                    setUserAnswer(letter)
                                                }
                                            }
                                        }}
                                        disabled={!!result}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            } ${result ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                    >
                                        <span className="text-gray-900">{option}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Short Answer Input */}
                    {question.type === 'short' && !result && (
                        <div className="mb-6">
                            <textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                                placeholder="请输入你的答案..."
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    {!result && (
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={submitting}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader className="h-5 w-5 animate-spin" />
                                    提交中...
                                </>
                            ) : (
                                <>
                                    <Check className="h-5 w-5" />
                                    提交答案
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Result */}
                {result && (
                    <div className={`rounded-xl p-6 mb-6 ${result.correct ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
                        }`}>
                        <div className="flex items-start gap-3 mb-4">
                            {result.correct ? (
                                <Check className="h-6 w-6 text-green-600 mt-0.5" />
                            ) : (
                                <X className="h-6 w-6 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <h3 className={`font-bold text-lg mb-2 ${result.correct ? 'text-green-900' : 'text-red-900'}`}>
                                    {result.correct ? '回答正确！' : '回答错误'}
                                </h3>

                                {!result.correct && (
                                    <div className="space-y-2 text-sm">
                                        <p className="text-gray-700">
                                            <span className="font-medium">你的答案：</span>{result.user_answer}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-medium">正确答案：</span>{result.correct_answer}
                                        </p>
                                    </div>
                                )}

                                {/* AI Score */}
                                {result.ai_score !== null && result.ai_score !== undefined && (
                                    <div className="mt-3 p-3 bg-white rounded-lg">
                                        <p className="text-sm font-medium text-gray-700 mb-1">
                                            AI 评分：{(result.ai_score * 100).toFixed(0)}%
                                        </p>
                                        {result.ai_feedback && (
                                            <p className="text-sm text-gray-600">{result.ai_feedback}</p>
                                        )}
                                    </div>
                                )}

                                {/* Analysis */}
                                {result.analysis && (
                                    <div className="mt-3 p-3 bg-white rounded-lg">
                                        <p className="text-sm font-medium text-gray-700 mb-1">解析：</p>
                                        <p className="text-sm text-gray-600">{result.analysis}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={handleNext}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {currentIndex < total - 1 ? '下一题' : '完成复习'}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default MistakePlayer
