"""
Exam Router - Handles exam creation, file upload, and deduplication
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import os
import aiofiles

from database import get_db
from models import User, Exam, Question, ExamStatus, SystemConfig
from schemas import (
    ExamCreate, ExamResponse, ExamListResponse,
    ExamUploadResponse, ParseResult, QuizProgressUpdate
)
from services.auth_service import get_current_user
from services.document_parser import document_parser
from services.llm_service import LLMService
from services.config_service import load_llm_config
from utils import is_allowed_file, calculate_content_hash

router = APIRouter()


async def check_upload_limits(user_id: int, file_size: int, db: AsyncSession):
    """Check if user has exceeded upload limits"""

    # Get max upload size config
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "max_upload_size_mb")
    )
    config = result.scalar_one_or_none()
    max_size_mb = int(config.value) if config else 10

    # Check file size
    if file_size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds limit of {max_size_mb}MB"
        )

    # Get max daily uploads config
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "max_daily_uploads")
    )
    config = result.scalar_one_or_none()
    max_daily = int(config.value) if config else 20

    # Check daily upload count
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Exam.id)).where(
            and_(
                Exam.user_id == user_id,
                Exam.created_at >= today_start
            )
        )
    )
    upload_count = result.scalar()

    if upload_count >= max_daily:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily upload limit of {max_daily} reached"
        )


async def process_questions_with_dedup(
    exam_id: int,
    questions_data: List[dict],
    db: AsyncSession
) -> ParseResult:
    """
    Process parsed questions with deduplication logic.

    Args:
        exam_id: Target exam ID
        questions_data: List of question dicts from LLM parsing
        db: Database session

    Returns:
        ParseResult with statistics
    """
    total_parsed = len(questions_data)
    duplicates_removed = 0
    new_added = 0

    # Get existing content hashes for this exam
    result = await db.execute(
        select(Question.content_hash).where(Question.exam_id == exam_id)
    )
    existing_hashes = set(row[0] for row in result.all())

    # Insert only new questions
    for q_data in questions_data:
        content_hash = q_data.get("content_hash")

        if content_hash in existing_hashes:
            duplicates_removed += 1
            continue

        # Create new question
        new_question = Question(
            exam_id=exam_id,
            content=q_data["content"],
            type=q_data["type"],
            options=q_data.get("options"),
            answer=q_data["answer"],
            analysis=q_data.get("analysis"),
            content_hash=content_hash
        )
        db.add(new_question)
        existing_hashes.add(content_hash)  # Add to set to prevent duplicates in current batch
        new_added += 1

    await db.commit()

    return ParseResult(
        total_parsed=total_parsed,
        duplicates_removed=duplicates_removed,
        new_added=new_added,
        message=f"Parsed {total_parsed} questions, removed {duplicates_removed} duplicates, added {new_added} new questions"
    )


async def async_parse_and_save(
    exam_id: int,
    file_content: bytes,
    filename: str,
    db_url: str
):
    """
    Background task to parse document and save questions with deduplication.
    """
    from database import AsyncSessionLocal
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        try:
            # Update exam status to processing
            result = await db.execute(select(Exam).where(Exam.id == exam_id))
            exam = result.scalar_one()
            exam.status = ExamStatus.PROCESSING
            await db.commit()

            # Parse document
            print(f"[Exam {exam_id}] Parsing document: {filename}")
            text_content = await document_parser.parse_file(file_content, filename)

            if not text_content or len(text_content.strip()) < 10:
                raise Exception("Document appears to be empty or too short")

            # Load LLM configuration from database
            llm_config = await load_llm_config(db)
            llm_service = LLMService(config=llm_config)

            # Parse questions using LLM
            print(f"[Exam {exam_id}] Calling LLM to extract questions...")
            questions_data = await llm_service.parse_document(text_content)

            if not questions_data:
                raise Exception("No questions found in document")

            # Process questions with deduplication
            print(f"[Exam {exam_id}] Processing questions with deduplication...")
            parse_result = await process_questions_with_dedup(exam_id, questions_data, db)

            # Update exam status and total questions
            result = await db.execute(select(Exam).where(Exam.id == exam_id))
            exam = result.scalar_one()

            # Get updated question count
            result = await db.execute(
                select(func.count(Question.id)).where(Question.exam_id == exam_id)
            )
            total_questions = result.scalar()

            exam.status = ExamStatus.READY
            exam.total_questions = total_questions
            await db.commit()

            print(f"[Exam {exam_id}] ✅ {parse_result.message}")

        except Exception as e:
            print(f"[Exam {exam_id}] ❌ Error: {str(e)}")

            # Update exam status to failed
            result = await db.execute(select(Exam).where(Exam.id == exam_id))
            exam = result.scalar_one()
            exam.status = ExamStatus.FAILED
            await db.commit()


@router.post("/create", response_model=ExamUploadResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_with_upload(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new exam and upload the first document.
    Document will be parsed asynchronously in background.
    """

    # Validate file
    if not file.filename or not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: txt, pdf, doc, docx, xlsx, xls"
        )

    # Read file content
    file_content = await file.read()

    # Check upload limits
    await check_upload_limits(current_user.id, len(file_content), db)

    # Create exam
    new_exam = Exam(
        user_id=current_user.id,
        title=title,
        status=ExamStatus.PENDING
    )
    db.add(new_exam)
    await db.commit()
    await db.refresh(new_exam)

    # Start background parsing
    background_tasks.add_task(
        async_parse_and_save,
        new_exam.id,
        file_content,
        file.filename,
        os.getenv("DATABASE_URL")
    )

    return ExamUploadResponse(
        exam_id=new_exam.id,
        title=new_exam.title,
        status=new_exam.status.value,
        message="Exam created. Document is being processed in background."
    )


@router.post("/{exam_id}/append", response_model=ExamUploadResponse)
async def append_document_to_exam(
    exam_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Append a new document to an existing exam.
    Questions will be parsed and deduplicated asynchronously.
    """

    # Get exam and verify ownership
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

    # Don't allow appending while processing
    if exam.status == ExamStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Exam is currently being processed. Please wait."
        )

    # Validate file
    if not file.filename or not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: txt, pdf, doc, docx, xlsx, xls"
        )

    # Read file content
    file_content = await file.read()

    # Check upload limits
    await check_upload_limits(current_user.id, len(file_content), db)

    # Start background parsing (will auto-deduplicate)
    background_tasks.add_task(
        async_parse_and_save,
        exam.id,
        file_content,
        file.filename,
        os.getenv("DATABASE_URL")
    )

    return ExamUploadResponse(
        exam_id=exam.id,
        title=exam.title,
        status=ExamStatus.PROCESSING.value,
        message=f"Document '{file.filename}' is being processed. Duplicates will be automatically removed."
    )


@router.get("/", response_model=ExamListResponse)
async def get_user_exams(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all exams for current user"""

    # Get total count
    result = await db.execute(
        select(func.count(Exam.id)).where(Exam.user_id == current_user.id)
    )
    total = result.scalar()

    # Get exams
    result = await db.execute(
        select(Exam)
        .where(Exam.user_id == current_user.id)
        .order_by(Exam.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    exams = result.scalars().all()

    return ExamListResponse(exams=exams, total=total)


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam_detail(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get exam details"""

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

    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an exam and all its questions"""

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

    await db.delete(exam)
    await db.commit()


@router.put("/{exam_id}/progress", response_model=ExamResponse)
async def update_quiz_progress(
    exam_id: int,
    progress: QuizProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update quiz progress (current_index)"""

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

    exam.current_index = progress.current_index
    await db.commit()
    await db.refresh(exam)

    return exam
