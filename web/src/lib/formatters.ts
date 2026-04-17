export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) {
    return `${days} 天前`;
  }
  if (hours > 0) {
    return `${hours} 小时前`;
  }
  if (minutes > 0) {
    return `${minutes} 分钟前`;
  }
  return "刚刚";
}

export function getExamStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "等待中",
    processing: "处理中",
    ready: "就绪",
    failed: "失败"
  };

  return map[status] || status;
}

export function getQuestionTypeLabel(type: string) {
  const map: Record<string, string> = {
    single: "单选",
    multiple: "多选",
    judge: "判断",
    short: "简答"
  };

  return map[type] || type;
}
