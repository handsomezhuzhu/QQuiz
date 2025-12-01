/**
 * Admin Settings Page
 */
import React, { useState, useEffect } from 'react'
import { adminAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Settings, Save, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export const AdminSettings = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    allow_registration: true,
    max_upload_size_mb: 10,
    max_daily_uploads: 20,
    ai_provider: 'openai'
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await adminAPI.getConfig()
      setConfig(response.data)
    } catch (error) {
      console.error('Failed to load config:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminAPI.updateConfig(config)
      toast.success('配置保存成功！')
    } catch (error) {
      console.error('Failed to save config:', error)
      toast.error('保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key, value) => {
    setConfig({
      ...config,
      [key]: value
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
              <p className="text-gray-600">管理员：{user?.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Allow Registration */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">允许用户注册</h3>
              <p className="text-sm text-gray-500">关闭后新用户无法注册</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.allow_registration}
                onChange={(e) => handleChange('allow_registration', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Max Upload Size */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              最大上传文件大小 (MB)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.max_upload_size_mb}
              onChange={(e) => handleChange('max_upload_size_mb', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">建议：5-20 MB</p>
          </div>

          {/* Max Daily Uploads */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              每日上传次数限制
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.max_daily_uploads}
              onChange={(e) => handleChange('max_daily_uploads', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">建议：10-50 次</p>
          </div>

          {/* AI Provider */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              AI 提供商
            </label>
            <select
              value={config.ai_provider}
              onChange={(e) => handleChange('ai_provider', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="openai">OpenAI (GPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="qwen">Qwen (通义千问)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              需在 .env 文件中配置对应的 API Key
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
