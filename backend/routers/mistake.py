"""
Mistake Router - Handles user mistake book (错题本)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Question, UserMistake, Exam
from schemas import MistakeAdd, MistakeResponse, MistakeListResponse
from services.auth_service import get_current_user

router = APIRouter()


@router.get("/", response_model=MistakeListResponse)
async def get_user_mistakes(
    skip: int = 0,
    limit: int = 50,
    exam_id: int = None,  # Optional filter by exam
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's mistake book with optional exam filter"""

    # Build query
    query = (
        select(UserMistake)
        .options(selectinload(UserMistake.question))
        .where(UserMistake.user_id == current_user.id)
        .order_by(UserMistake.created_at.desc())
    )

    # Apply exam filter if provided
    if exam_id is not None:
        query = query.join(Question).where(Question.exam_id == exam_id)

    # Get total count
    count_query = select(func.count(UserMistake.id)).where(UserMistake.user_id == current_user.id)
    if exam_id is not None:
        count_query = count_query.join(Question).where(Question.exam_id == exam_id)

    result = await db.execute(count_query)
    total = result.scalar()

    # Get mistakes
    result = await db.execute(query.offset(skip).limit(limit))
    mistakes = result.scalars().all()

    # Format response
    mistake_responses = []
    for mistake in mistakes:
        mistake_responses.append(
            MistakeResponse(
                id=mistake.id,
                user_id=mistake.user_id,
                question_id=mistake.question_id,
                question=mistake.question,
                created_at=mistake.created_at
            )
        )

    return MistakeListResponse(mistakes=mistake_responses, total=total)


@router.post("/add", response_model=MistakeResponse, status_code=status.HTTP_201_CREATED)
async def add_to_mistakes(
    mistake_data: MistakeAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually add a question to mistake book"""

    # Verify question exists and user has access to it
    result = await db.execute(
        select(Question)
        .join(Exam)
        .where(
            and_(
                Question.id == mistake_data.question_id,
                Exam.user_id == current_user.id
            )
        )
    )
    question = result.scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found or you don't have access"
        )

    # Check if already in mistake book
    result = await db.execute(
        select(UserMistake).where(
            and_(
                UserMistake.user_id == current_user.id,
                UserMistake.question_id == mistake_data.question_id
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question already in mistake book"
        )

    # Add to mistake book
    new_mistake = UserMistake(
        user_id=current_user.id,
        question_id=mistake_data.question_id
    )
    db.add(new_mistake)
    await db.commit()
    await db.refresh(new_mistake)

    # Load question relationship
    result = await db.execute(
        select(UserMistake)
        .options(selectinload(UserMistake.question))
        .where(UserMistake.id == new_mistake.id)
    )
    new_mistake = result.scalar_one()

    return MistakeResponse(
        id=new_mistake.id,
        user_id=new_mistake.user_id,
        question_id=new_mistake.question_id,
        question=new_mistake.question,
        created_at=new_mistake.created_at
    )


@router.delete("/{mistake_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_mistakes(
    mistake_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a question from mistake book"""

    # Get mistake and verify ownership
    result = await db.execute(
        select(UserMistake).where(
            and_(
                UserMistake.id == mistake_id,
                UserMistake.user_id == current_user.id
            )
        )
    )
    mistake = result.scalar_one_or_none()

    if not mistake:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mistake record not found"
        )

    await db.delete(mistake)
    await db.commit()


@router.delete("/question/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_question_from_mistakes(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a question from mistake book by question ID"""

    # Get mistake and verify ownership
    result = await db.execute(
        select(UserMistake).where(
            and_(
                UserMistake.question_id == question_id,
                UserMistake.user_id == current_user.id
            )
        )
    )
    mistake = result.scalar_one_or_none()

    if not mistake:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in mistake book"
        )

    await db.delete(mistake)
    await db.commit()
