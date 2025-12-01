"""
Question Router - Handles quiz playing and answer checking
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional

from database import get_db
from models import User, Exam, Question, UserMistake, ExamStatus, QuestionType
from schemas import (
    QuestionResponse, QuestionListResponse,
    AnswerSubmit, AnswerCheckResponse
)
from services.auth_service import get_current_user
from services.llm_service import LLMService
from services.config_service import load_llm_config

router = APIRouter()


@router.get("/exam/{exam_id}/questions", response_model=QuestionListResponse)
async def get_exam_questions(
    exam_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all questions for an exam"""

    # Verify exam ownership
    result = await db.execute(
        select(Exam).where(
            and_(Exam.id == exam_id, Exam.user_id == current_user.id)
        )
    )
    exam = result.scalar_one_or_none()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    # Get total count
    result = await db.execute(
        select(func.count(Question.id)).where(Question.exam_id == exam_id)
    )
    total = result.scalar()

    # Get questions
    result = await db.execute(
        select(Question)
        .where(Question.exam_id == exam_id)
        .order_by(Question.id)
        .offset(skip)
        .limit(limit)
    )
    questions = result.scalars().all()

    return QuestionListResponse(questions=questions, total=total)


@router.get("/exam/{exam_id}/current", response_model=QuestionResponse)
async def get_current_question(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current question based on exam's current_index"""

    # Get exam
    result = await db.execute(
        select(Exam).where(
            and_(Exam.id == exam_id, Exam.user_id == current_user.id)
        )
    )
    exam = result.scalar_one_or_none()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    if exam.status != ExamStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exam is not ready. Status: {exam.status.value}"
        )

    # Get questions
    result = await db.execute(
        select(Question)
        .where(Question.exam_id == exam_id)
        .order_by(Question.id)
        .offset(exam.current_index)
        .limit(1)
    )
    question = result.scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No more questions available. You've completed this exam!"
        )

    return question


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question_by_id(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific question by ID"""

    # Get question and verify access through exam ownership
    result = await db.execute(
        select(Question)
        .join(Exam)
        .where(
            and_(
                Question.id == question_id,
                Exam.user_id == current_user.id
            )
        )
    )
    question = result.scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    return question


@router.post("/check", response_model=AnswerCheckResponse)
async def check_answer(
    answer_data: AnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check user's answer and return result.
    For short answers, use AI to grade.
    Automatically add wrong answers to mistake book.
    """

    # Get question and verify access
    result = await db.execute(
        select(Question)
        .join(Exam)
        .where(
            and_(
                Question.id == answer_data.question_id,
                Exam.user_id == current_user.id
            )
        )
    )
    question = result.scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    user_answer = answer_data.user_answer.strip()
    correct_answer = question.answer.strip()
    is_correct = False
    ai_score = None
    ai_feedback = None

    # Check answer based on question type
    if question.type == QuestionType.SHORT:
        # Load LLM configuration from database
        llm_config = await load_llm_config(db)
        llm_service = LLMService(config=llm_config)

        # Use AI to grade short answer
        grading = await llm_service.grade_short_answer(
            question.content,
            correct_answer,
            user_answer
        )
        ai_score = grading["score"]
        ai_feedback = grading["feedback"]
        is_correct = ai_score >= 0.7  # Consider 70% as correct

    elif question.type == QuestionType.MULTIPLE:
        # For multiple choice, normalize answer (sort letters)
        user_normalized = ''.join(sorted(user_answer.upper().replace(' ', '')))
        correct_normalized = ''.join(sorted(correct_answer.upper().replace(' ', '')))
        is_correct = user_normalized == correct_normalized

    else:
        # For single choice and judge questions
        is_correct = user_answer.upper() == correct_answer.upper()

    # If wrong, add to mistake book
    if not is_correct:
        # Check if already in mistake book
        result = await db.execute(
            select(UserMistake).where(
                and_(
                    UserMistake.user_id == current_user.id,
                    UserMistake.question_id == question.id
                )
            )
        )
        existing_mistake = result.scalar_one_or_none()

        if not existing_mistake:
            new_mistake = UserMistake(
                user_id=current_user.id,
                question_id=question.id
            )
            db.add(new_mistake)
            await db.commit()

    return AnswerCheckResponse(
        correct=is_correct,
        user_answer=user_answer,
        correct_answer=correct_answer,
        analysis=question.analysis,
        ai_score=ai_score,
        ai_feedback=ai_feedback
    )
