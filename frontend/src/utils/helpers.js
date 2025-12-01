/**
 * Utility Helper Functions
 */

/**
 * Format date to readable string
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return formatDate(dateString)
  } else if (days > 0) {
    return `${days} 天前`
  } else if (hours > 0) {
    return `${hours} 小时前`
  } else if (minutes > 0) {
    return `${minutes} 分钟前`
  } else {
    return '刚刚'
  }
}

/**
 * Get exam status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get exam status text
 */
export const getStatusText = (status) => {
  const texts = {
    pending: '等待中',
    processing: '处理中',
    ready: '就绪',
    failed: '失败'
  }
  return texts[status] || status
}

/**
 * Get question type text
 */
export const getQuestionTypeText = (type) => {
  const texts = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    short: '简答题'
  }
  return texts[type] || type
}

/**
 * Calculate progress percentage
 */
export const calculateProgress = (current, total) => {
  if (total === 0) return 0
  return Math.round((current / total) * 100)
}

/**
 * Validate file type
 */
export const isValidFileType = (filename) => {
  const allowedExtensions = ['txt', 'pdf', 'doc', 'docx', 'xlsx', 'xls']
  const extension = filename.split('.').pop().toLowerCase()
  return allowedExtensions.includes(extension)
}

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
