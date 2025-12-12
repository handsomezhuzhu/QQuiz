"""
Pydantic Schemas for Request/Response Validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from models import ExamStatus, QuestionType


# ============ Auth Schemas ============
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    is_admin: bool = False  # 支持管理员创建用户时指定角色

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (allows _ and -)')
        return v


class UserUpdate(BaseModel):
    """用户更新 Schema（所有字段可选）"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=6)
    is_admin: Optional[bool] = None

    @validator('username')
    def username_alphanumeric(cls, v):
        if v is not None and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (allows _ and -)')
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """用户列表响应（包含分页信息）"""
    users: List[dict]  # 包含额外统计信息的用户列表
    total: int
    skip: int
    limit: int


# ============ System Config Schemas ============
class SystemConfigUpdate(BaseModel):
    allow_registration: Optional[bool] = None
    max_upload_size_mb: Optional[int] = None
    max_daily_uploads: Optional[int] = None
    ai_provider: Optional[str] = None
    # API Configuration
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_model: Optional[str] = None
    qwen_api_key: Optional[str] = None
    qwen_base_url: Optional[str] = None
    qwen_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_base_url: Optional[str] = None
    gemini_model: Optional[str] = None


class SystemConfigResponse(BaseModel):
    allow_registration: bool
    max_upload_size_mb: int
    max_daily_uploads: int
    ai_provider: str
    # API Configuration
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_model: Optional[str] = None
    qwen_api_key: Optional[str] = None
    qwen_base_url: Optional[str] = None
    qwen_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_base_url: Optional[str] = None
    gemini_model: Optional[str] = None


# ============ Exam Schemas ============
class ExamCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ExamResponse(BaseModel):
    id: int
    user_id: int
    title: str
    status: ExamStatus
    current_index: int
    total_questions: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExamListResponse(BaseModel):
    exams: List[ExamResponse]
    total: int


class ExamUploadResponse(BaseModel):
    exam_id: int
    title: str
    status: str
    message: str


class ParseResult(BaseModel):
    """Result from file parsing"""
    total_parsed: int
    duplicates_removed: int
    new_added: int
    message: str


# ============ Question Schemas ============
class QuestionBase(BaseModel):
    content: str
    type: QuestionType
    options: Optional[List[str]] = None
    answer: str
    analysis: Optional[str] = None


class QuestionCreate(QuestionBase):
    exam_id: int


class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionListResponse(BaseModel):
    questions: List[QuestionResponse]
    total: int


# ============ Quiz Schemas ============
class AnswerSubmit(BaseModel):
    question_id: int
    user_answer: str


class AnswerCheckResponse(BaseModel):
    correct: bool
    user_answer: str
    correct_answer: str
    analysis: Optional[str] = None
    ai_score: Optional[float] = None  # For short answer questions
    ai_feedback: Optional[str] = None  # For short answer questions


class QuizProgressUpdate(BaseModel):
    current_index: int


# ============ Mistake Schemas ============
class MistakeAdd(BaseModel):
    question_id: int


class MistakeResponse(BaseModel):
    id: int
    user_id: int
    question_id: int
    question: QuestionResponse
    created_at: datetime

    class Config:
        from_attributes = True


class MistakeListResponse(BaseModel):
    mistakes: List[MistakeResponse]
    total: int
