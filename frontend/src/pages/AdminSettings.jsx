/**
 * Admin Settings Page - Enhanced with API Configuration
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Settings, Save, Loader, Key, Link as LinkIcon, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export const AdminSettings = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    qwen: false,
    gemini: false
  })

  const [config, setConfig] = useState({
    allow_registration: true,
    max_upload_size_mb: 10,
    max_daily_uploads: 20,
    ai_provider: 'gemini',
    // OpenAI
    openai_api_key: '',
    openai_base_url: 'https://api.openai.com/v1',
    openai_model: 'gpt-4o-mini',
    // Anthropic
    anthropic_api_key: '',
    anthropic_model: 'claude-3-haiku-20240307',
    // Qwen
    qwen_api_key: '',
    qwen_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    qwen_model: 'qwen-plus',
    // Gemini
    gemini_api_key: '',
    gemini_base_url: '',
    gemini_model: 'gemini-2.0-flash-exp'
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

  const toggleApiKeyVisibility = (provider) => {
    setShowApiKeys({
      ...showApiKeys,
      [provider]: !showApiKeys[provider]
    })
  }

  // Get complete API endpoint URL
  const getCompleteEndpoint = (provider) => {
    const endpoints = {
      openai: '/chat/completions',
      anthropic: '/messages',
      qwen: '/chat/completions'
    }

    let baseUrl = ''
    if (provider === 'openai') {
      baseUrl = config.openai_base_url || 'https://api.openai.com/v1'
    } else if (provider === 'anthropic') {
      baseUrl = 'https://api.anthropic.com/v1'
    } else if (provider === 'qwen') {
      baseUrl = config.qwen_base_url || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    }

    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '')

    return `${baseUrl}${endpoints[provider]}`
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
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="返回"
              >
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <Settings className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
                <p className="text-gray-600">管理员：{user?.username}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Basic Settings */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">基础设置</h2>

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
              <option value="gemini">Google Gemini (推荐)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="qwen">Qwen (通义千问)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              选择后在下方配置对应的 API 密钥。Gemini 支持原生 PDF 解析
            </p>
          </div>
        </div>

        {/* OpenAI Configuration */}
        <div className={`bg-white rounded-xl shadow-md p-6 space-y-4 ${config.ai_provider === 'openai' ? 'ring-2 ring-primary-500' : ''}`}>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">OpenAI 配置</h2>
            {config.ai_provider === 'openai' && (
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">当前使用</span>
            )}
          </div>

          {/* Text-only warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ⚠️ OpenAI 仅支持文本解析，不支持 PDF 原生理解。PDF 文件将通过文本提取处理，可能丢失格式和图片信息。
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys.openai ? 'text' : 'password'}
                value={config.openai_api_key || ''}
                onChange={(e) => handleChange('openai_api_key', e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => toggleApiKeyVisibility('openai')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.openai ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">从 https://platform.openai.com/api-keys 获取</p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Base URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={config.openai_base_url}
                onChange={(e) => handleChange('openai_base_url', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              完整 endpoint: <code className="bg-gray-100 px-2 py-0.5 rounded">{getCompleteEndpoint('openai')}</code>
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              模型
            </label>
            <input
              type="text"
              list="openai-models"
              value={config.openai_model}
              onChange={(e) => handleChange('openai_model', e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
            <datalist id="openai-models">
              <option value="gpt-4o">gpt-4o (最强)</option>
              <option value="gpt-4o-mini">gpt-4o-mini (推荐)</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </datalist>
            <p className="text-xs text-gray-500 mt-1">可输入自定义模型名称，或从建议中选择</p>
          </div>
        </div>

        {/* Anthropic Configuration */}
        <div className={`bg-white rounded-xl shadow-md p-6 space-y-4 ${config.ai_provider === 'anthropic' ? 'ring-2 ring-primary-500' : ''}`}>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Anthropic 配置</h2>
            {config.ai_provider === 'anthropic' && (
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">当前使用</span>
            )}
          </div>

          {/* Text-only warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ⚠️ Anthropic 仅支持文本解析，不支持 PDF 原生理解。PDF 文件将通过文本提取处理，可能丢失格式和图片信息。
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys.anthropic ? 'text' : 'password'}
                value={config.anthropic_api_key || ''}
                onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => toggleApiKeyVisibility('anthropic')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.anthropic ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">从 https://console.anthropic.com/settings/keys 获取</p>
          </div>

          {/* Base URL (fixed for Anthropic) */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Base URL (固定)
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value="https://api.anthropic.com/v1"
                disabled
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              完整 endpoint: <code className="bg-gray-100 px-2 py-0.5 rounded">{getCompleteEndpoint('anthropic')}</code>
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              模型
            </label>
            <input
              type="text"
              list="anthropic-models"
              value={config.anthropic_model}
              onChange={(e) => handleChange('anthropic_model', e.target.value)}
              placeholder="claude-3-haiku-20240307"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
            <datalist id="anthropic-models">
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (最强)</option>
              <option value="claude-3-haiku-20240307">claude-3-haiku (推荐)</option>
              <option value="claude-3-opus-20240229">claude-3-opus</option>
              <option value="claude-3-sonnet-20240229">claude-3-sonnet</option>
            </datalist>
            <p className="text-xs text-gray-500 mt-1">可输入自定义模型名称，或从建议中选择</p>
          </div>
        </div>

        {/* Qwen Configuration */}
        <div className={`bg-white rounded-xl shadow-md p-6 space-y-4 ${config.ai_provider === 'qwen' ? 'ring-2 ring-primary-500' : ''}`}>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">通义千问 配置</h2>
            {config.ai_provider === 'qwen' && (
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">当前使用</span>
            )}
          </div>

          {/* Text-only warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ⚠️ 通义千问 仅支持文本解析，不支持 PDF 原生理解。PDF 文件将通过文本提取处理，可能丢失格式和图片信息。
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys.qwen ? 'text' : 'password'}
                value={config.qwen_api_key || ''}
                onChange={(e) => handleChange('qwen_api_key', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => toggleApiKeyVisibility('qwen')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.qwen ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">从 https://dashscope.console.aliyun.com/apiKey 获取</p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Base URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={config.qwen_base_url}
                onChange={(e) => handleChange('qwen_base_url', e.target.value)}
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              完整 endpoint: <code className="bg-gray-100 px-2 py-0.5 rounded">{getCompleteEndpoint('qwen')}</code>
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              模型
            </label>
            <input
              type="text"
              list="qwen-models"
              value={config.qwen_model}
              onChange={(e) => handleChange('qwen_model', e.target.value)}
              placeholder="qwen-plus"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
            <datalist id="qwen-models">
              <option value="qwen-max">qwen-max (最强)</option>
              <option value="qwen-plus">qwen-plus (推荐)</option>
              <option value="qwen-turbo">qwen-turbo (快速)</option>
              <option value="qwen-long">qwen-long (长文本)</option>
            </datalist>
            <p className="text-xs text-gray-500 mt-1">可输入自定义模型名称，或从建议中选择</p>
          </div>
        </div>

        {/* Gemini Configuration */}
        <div className={`bg-white rounded-xl shadow-md p-6 space-y-4 ${config.ai_provider === 'gemini' ? 'ring-2 ring-primary-500' : ''}`}>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Google Gemini 配置</h2>
            {config.ai_provider === 'gemini' && (
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">当前使用</span>
            )}
          </div>

          {/* PDF support highlight */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              ✅ Gemini 支持原生 PDF 理解，可直接处理 PDF 文件（最多 1000 页），完整保留图片、表格、公式等内容。
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKeys.gemini ? 'text' : 'password'}
                value={config.gemini_api_key || ''}
                onChange={(e) => handleChange('gemini_api_key', e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => toggleApiKeyVisibility('gemini')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.gemini ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">从 https://aistudio.google.com/apikey 获取</p>
          </div>

          {/* Base URL (optional) */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Base URL (可选)
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={config.gemini_base_url}
                onChange={(e) => handleChange('gemini_base_url', e.target.value)}
                placeholder="https://generativelanguage.googleapis.com（留空使用默认）"
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              可配置自定义代理或中转服务（支持 Key 轮训等）。留空则使用 Google 官方 API
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              模型
            </label>
            <input
              type="text"
              list="gemini-models"
              value={config.gemini_model}
              onChange={(e) => handleChange('gemini_model', e.target.value)}
              placeholder="gemini-2.0-flash-exp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
            <datalist id="gemini-models">
              <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (最新，推荐)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (最强)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (快速)</option>
              <option value="gemini-1.0-pro">gemini-1.0-pro</option>
            </datalist>
            <p className="text-xs text-gray-500 mt-1">可输入自定义模型名称，或从建议中选择</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-xl shadow-md p-6">
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
                保存所有设置
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
