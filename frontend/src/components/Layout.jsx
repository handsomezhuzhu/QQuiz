/**
 * Main Layout Component with Navigation
 */
import React, { useState } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BookOpen,
  LayoutDashboard,
  FolderOpen,
  XCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react'

export const Layout = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: '首页', href: '/dashboard', icon: LayoutDashboard },
    { name: '题库管理', href: '/exams', icon: FolderOpen },
    { name: '错题本', href: '/mistakes', icon: XCircle },
  ]

  if (isAdmin) {
    navigation.push({ name: '管理面板', href: '/admin', icon: Shield })
    navigation.push({ name: '系统设置', href: '/admin/settings', icon: Settings })
  }

  const isActive = (href) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary-600" />
            <span className="font-bold text-lg">QQuiz</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 px-4 py-3 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.href)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
              <span>退出登录</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
              <div className="bg-primary-600 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">QQuiz</h1>
                <p className="text-xs text-gray-500">{user?.username}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.href)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* Logout */}
            <div className="px-4 py-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:pl-64">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
