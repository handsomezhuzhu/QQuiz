/**
 * Admin Panel - 完整的管理员面板
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  Users, BarChart3, Settings, Trash2, Plus, Search,
  ArrowLeft, Shield, Activity, Database, Download
} from 'lucide-react'
import toast from 'react-hot-toast'

export const AdminPanel = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('stats')

  // 统计数据
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)

  // 用户数据
  const [users, setUsers] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false })

  useEffect(() => {
    loadStats()
    loadHealth()
    loadUsers()
  }, [])

  const loadStats = async () => {
    try {
      const res = await adminAPI.getStatistics()
      setStats(res.data)
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }

  const loadHealth = async () => {
    try {
      const res = await adminAPI.getHealth()
      setHealth(res.data)
    } catch (error) {
      console.error('Failed to load health:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await adminAPI.getUsers(0, 100, searchQuery || null)
      setUsers(res.data.users)
      setUsersTotal(res.data.total)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('加载用户列表失败')
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('请填写用户名和密码')
      return
    }
    try {
      await adminAPI.createUser(newUser.username, newUser.password, newUser.is_admin)
      toast.success('用户创建成功')
      setShowCreateModal(false)
      setNewUser({ username: '', password: '', is_admin: false })
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || '创建用户失败')
    }
  }

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`确定删除用户 ${username}？`)) return
    try {
      await adminAPI.deleteUser(userId)
      toast.success('用户已删除')
      loadUsers()
    } catch (error) {
      toast.error(error.response?.data?.detail || '删除失败')
    }
  }

  const handleExportUsers = async () => {
    try {
      const response = await adminAPI.exportUsers()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'users.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">管理员面板</h1>
        <p className="text-gray-600 mt-1">系统统计与用户管理</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'stats'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              系统统计
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              用户管理
            </div>
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">用户总数</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.users?.total || 0}</p>
                  </div>
                  <Users className="h-12 w-12 text-blue-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">题库总数</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.exams?.total || 0}</p>
                  </div>
                  <Database className="h-12 w-12 text-green-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">题目总数</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.questions?.total || 0}</p>
                  </div>
                  <Activity className="h-12 w-12 text-purple-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">今日活跃</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activity?.today_active_users || 0}</p>
                  </div>
                  <Shield className="h-12 w-12 text-orange-500 opacity-20" />
                </div>
              </div>
            </div>

            {/* System Health */}
            {health && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">系统状态</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">状态</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {health.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">数据库</span>
                    <span className="text-gray-900">{health.system?.database_url || 'SQLite'}</span>
                  </div>
                  {health.database?.size_mb && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">数据库大小</span>
                      <span className="text-gray-900">{health.database.size_mb} MB</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportUsers}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  导出
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden md:inline">创建用户</span>
                  <span className="md:hidden">新建</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">题库数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">错题数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{u.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.username}</td>
                      <td className="px-6 py-4">
                        {u.is_admin ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">管理员</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">普通用户</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.exam_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.mistake_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.username === 'admin'}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建新用户</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newUser.is_admin}
                  onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-gray-700">设为管理员</label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
