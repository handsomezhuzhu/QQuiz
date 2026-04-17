export interface AuthUser {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface ExamSummary {
  id: number;
  user_id: number;
  title: string;
  status: "pending" | "processing" | "ready" | "failed";
  current_index: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

export interface ExamListResponse {
  exams: ExamSummary[];
  total: number;
}

export interface ExamSummaryStats {
  total_exams: number;
  total_questions: number;
  completed_questions: number;
  processing_exams: number;
  ready_exams: number;
  failed_exams: number;
}

export interface QuestionListItem {
  id: number;
  exam_id: number;
  content: string;
  type: "single" | "multiple" | "judge" | "short";
  options?: string[] | null;
  analysis?: string | null;
  created_at: string;
}

export interface QuestionDetail extends QuestionListItem {}

export interface QuestionListResponse {
  questions: QuestionListItem[];
  total: number;
}

export interface AnswerCheckResponse {
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  analysis?: string | null;
  ai_score?: number | null;
  ai_feedback?: string | null;
}

export interface ExamUploadResponse {
  exam_id: number;
  title: string;
  status: string;
  message: string;
}

export interface ProgressEvent {
  exam_id: number;
  status: string;
  message: string;
  progress: number;
  total_chunks: number;
  current_chunk: number;
  questions_extracted: number;
  questions_added: number;
  duplicates_removed: number;
  timestamp: string;
}

export interface MistakeListResponse {
  mistakes: Array<{
    id: number;
    user_id: number;
    question_id: number;
    created_at: string;
    question: {
      id: number;
      exam_id: number;
      content: string;
      type: "single" | "multiple" | "judge" | "short";
      options?: string[] | null;
      answer: string;
      analysis?: string | null;
      created_at: string;
    };
  }>;
  total: number;
}

export interface AdminUserSummary extends AuthUser {
  exam_count: number;
  mistake_count: number;
}

export interface UserListResponse {
  users: AdminUserSummary[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminStatisticsResponse {
  users: {
    total: number;
    admins: number;
    regular_users: number;
  };
  exams: {
    total: number;
    today_uploads: number;
    by_status: Record<string, number>;
    upload_trend: Array<{ date: string; count: number }>;
  };
  questions: {
    total: number;
    by_type: Record<string, number>;
  };
  activity: {
    today_active_users: number;
    today_uploads: number;
  };
}

export interface SystemConfigResponse {
  allow_registration: boolean;
  max_upload_size_mb: number;
  max_daily_uploads: number;
  ai_provider: string;
  openai_api_key?: string | null;
  openai_base_url?: string | null;
  openai_model?: string | null;
  anthropic_api_key?: string | null;
  anthropic_model?: string | null;
  qwen_api_key?: string | null;
  qwen_base_url?: string | null;
  qwen_model?: string | null;
  gemini_api_key?: string | null;
  gemini_base_url?: string | null;
  gemini_model?: string | null;
}
