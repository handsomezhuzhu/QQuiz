"""
SQLAlchemy Models for QQuiz Platform
"""
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, JSON, Index, Enum
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class ExamStatus(str, PyEnum):
    """Exam processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class QuestionType(str, PyEnum):
    """Question types"""
    SINGLE = "single"      # 单选
    MULTIPLE = "multiple"  # 多选
    JUDGE = "judge"        # 判断
    SHORT = "short"        # 简答


class User(Base):
    """User model"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    exams = relationship("Exam", back_populates="user", cascade="all, delete-orphan")
    mistakes = relationship("UserMistake", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', is_admin={self.is_admin})>"


class SystemConfig(Base):
    """System configuration key-value store"""
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SystemConfig(key='{self.key}', value='{self.value}')>"


class Exam(Base):
    """Exam (Question Bank Container)"""
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    status = Column(Enum(ExamStatus), default=ExamStatus.PENDING, nullable=False, index=True)
    current_index = Column(Integer, default=0, nullable=False)
    total_questions = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="exams")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('ix_exams_user_status', 'user_id', 'status'),
    )

    def __repr__(self):
        return f"<Exam(id={self.id}, title='{self.title}', status={self.status}, questions={self.total_questions})>"


class Question(Base):
    """Question model"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(Enum(QuestionType), nullable=False)
    options = Column(JSON, nullable=True)  # For single/multiple choice: ["A. Option1", "B. Option2", ...]
    answer = Column(Text, nullable=False)
    analysis = Column(Text, nullable=True)
    content_hash = Column(String(32), nullable=False, index=True)  # MD5 hash for deduplication
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    mistakes = relationship("UserMistake", back_populates="question", cascade="all, delete-orphan")

    # Indexes for deduplication within exam scope
    __table_args__ = (
        Index('ix_questions_exam_hash', 'exam_id', 'content_hash'),
    )

    def __repr__(self):
        return f"<Question(id={self.id}, type={self.type}, hash={self.content_hash[:8]}...)>"


class UserMistake(Base):
    """User mistake records (错题本)"""
    __tablename__ = "user_mistakes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="mistakes")
    question = relationship("Question", back_populates="mistakes")

    # Unique constraint to prevent duplicates
    __table_args__ = (
        Index('ix_user_mistakes_unique', 'user_id', 'question_id', unique=True),
    )

    def __repr__(self):
        return f"<UserMistake(user_id={self.user_id}, question_id={self.question_id})>"
