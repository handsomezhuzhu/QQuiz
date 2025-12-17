/**
 * Quiz Player Page - Core quiz functionality
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { examAPI, questionAPI, mistakeAPI } from '../api/client'
import Layout from '../components/Layout'
import {
  ArrowLeft, ArrowRight, Check, X, Loader, BookmarkPlus, BookmarkX, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getQuestionTypeText } from '../utils/helpers'

export const QuizPlayer = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [exam, setExam] = useState(null)
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [multipleAnswers, setMultipleAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [inMistakeBook, setInMistakeBook] = useState(false)

  useEffect(() => {
    loadQuiz()
  }, [examId])

  const loadQuiz = async () => {
    try {
      // Check if reset flag is present
      const shouldReset = searchParams.get('reset') === 'true'
      if (shouldReset) {
        await examAPI.updateProgress(examId, 0)
      }

      const examRes = await examAPI.getDetail(examId)
      setExam(examRes.data)

      await loadCurrentQuestion()
    } catch (error) {
      console.error('Failed to load quiz:', error)
      toast.error('加载题目失败')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentQuestion = async () => {
    try {
      const response = await questionAPI.getCurrentQuestion(examId)
      // For judge questions, ensure options exist
      if (response.data.type === 'judge' && (!response.data.options || response.data.options.length === 0)) {
        response.data.options = ['A. 正确', 'B. 错误']
      }
      setQuestion(response.data)
      setResult(null)
      setUserAnswer('')
      setMultipleAnswers([])
      await checkIfInMistakeBook(response.data.id)
    } catch (error) {
      if (error.response?.status === 404) {
        toast.success('恭喜！所有题目已完成！')
        navigate(`/exams/${examId}`)
      } else {
        console.error('Failed to load question:', error)
        toast.error('加载题目失败')
      }
    }
  }

  const checkIfInMistakeBook = async (questionId) => {
    try {
      const response = await mistakeAPI.getList(0, 1000) // TODO: Optimize this
      const inBook = response.data.mistakes.some(m => m.question_id === questionId)
      setInMistakeBook(inBook)
    } catch (error) {
      console.error('Failed to check mistake book:', error)
    }
  }

  const handleSubmitAnswer = async () => {
    let answer = userAnswer

    // For multiple choice, join selected options
    if (question.type === 'multiple') {
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
      const response = await questionAPI.checkAnswer(question.id, answer)
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

  const handleNext = async () => {
    try {
      const newIndex = exam.current_index + 1
      await examAPI.updateProgress(examId, newIndex)

      const examRes = await examAPI.getDetail(examId)
      setExam(examRes.data)

      await loadCurrentQuestion()
    } catch (error) {
      console.error('Failed to move to next question:', error)
    }
  }

  const handleToggleMistake = async () => {
    try {
      if (inMistakeBook) {
        await mistakeAPI.removeByQuestionId(question.id)
        setInMistakeBook(false)
        toast.success('已从错题本移除')
      } else {
        await mistakeAPI.add(question.id)
        setInMistakeBook(true)
        toast.success('已加入错题本')
      }
    } catch (error) {
      console.error('Failed to toggle mistake:', error)
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!question) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-600">没有更多题目了</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/exams/${examId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            返回
          </button>

          <div className="text-sm text-gray-600">
            进度: {exam.current_index + 1} / {exam.total_questions}
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 mb-6">
          {/* Question Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                {exam.current_index + 1}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                {getQuestionTypeText(question.type)}
              </span>
            </div>

            <button
              onClick={handleToggleMistake}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${inMistakeBook
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {inMistakeBook ? (
                <>
                  <BookmarkX className="h-5 w-5" />
                  <span className="hidden sm:inline">移出错题本</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-5 w-5" />
                  <span className="hidden sm:inline">加入错题本</span>
                </>
              )}
            </button>
          </div>

          {/* Question Content */}
          <div className="mb-6">
            <p className="text-lg md:text-xl text-gray-900 leading-relaxed">
              {question.content}
            </p>
          </div>

          {/* Options (for choice questions) */}
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

                {/* AI Score for short answers */}
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
              下一题
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default QuizPlayer
