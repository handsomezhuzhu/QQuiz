/**
 * Dashboard Page
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { examAPI, mistakeAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import {
  FolderOpen, XCircle, TrendingUp, BookOpen, ArrowRight, Settings
} from 'lucide-react'
import { getStatusColor, getStatusText, formatRelativeTime, calculateProgress } from '../utils/helpers'

export const Dashboard = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalExams: 0,
    totalQuestions: 0,
    completedQuestions: 0,
    mistakeCount: 0
  })

  const [recentExams, setRecentExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [examsRes, mistakesRes] = await Promise.all([
        examAPI.getList(0, 5),
        mistakeAPI.getList(0, 1)
      ])

      const exams = examsRes.data.exams

      // Calculate stats
      const totalQuestions = exams.reduce((sum, e) => sum + e.total_questions, 0)
      const completedQuestions = exams.reduce((sum, e) => sum + e.current_index, 0)

      setStats({
        totalExams: exams.length,
        totalQuestions,
        completedQuestions,
        mistakeCount: mistakesRes.data.total
      })

      setRecentExams(exams)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            欢迎回来，{user?.username}！
          </h1>
          <p className="text-gray-600 mt-1">继续你的学习之旅</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/exams')}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary-100 p-2 rounded-lg">
                <FolderOpen className="h-5 w-5 text-primary-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.totalExams}</span>
            </div>
            <p className="text-sm text-gray-600">题库总数</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</span>
            </div>
            <p className="text-sm text-gray-600">题目总数</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.completedQuestions}</span>
            </div>
            <p className="text-sm text-gray-600">已完成</p>
          </div>

          <div
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/mistakes')}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.mistakeCount}</span>
            </div>
            <p className="text-sm text-gray-600">错题数量</p>
          </div>
        </div>

        {/* Recent Exams */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">最近的题库</h2>
            <button
              onClick={() => navigate('/exams')}
              className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {recentExams.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">还没有题库，快去创建一个吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => navigate(`/exams/${exam.id}`)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exam.status)}`}>
                      {getStatusText(exam.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {exam.current_index} / {exam.total_questions} 题
                    </span>
                    <span>{formatRelativeTime(exam.updated_at)}</span>
                  </div>

                  {exam.total_questions > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${calculateProgress(exam.current_index, exam.total_questions)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Quick Access */}
        {isAdmin && (
          <div className="mt-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">管理员功能</h3>
                <p className="text-sm text-primary-100">配置系统设置</p>
              </div>
              <button
                onClick={() => navigate('/admin/settings')}
                className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors flex items-center gap-2"
              >
                <Settings className="h-5 w-5" />
                系统设置
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Dashboard
