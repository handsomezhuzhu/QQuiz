"""
Exam Router - Handles exam creation, file upload, and deduplication
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import os
import aiofiles
import json

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
from services.progress_service import progress_service
from utils import is_allowed_file, calculate_content_hash
from dedup_utils import is_duplicate_question

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


async def generate_ai_reference_answer(
    llm_service,
    question_content: str,
    question_type: str,
    options: Optional[List[str]] = None
) -> str:
    """
    Generate an AI reference answer for a question without a provided answer.

    Args:
        llm_service: LLM service instance
        question_content: The question text
        question_type: Type of question (single, multiple, judge, short)
        options: Question options (for choice questions)

    Returns:
        Generated answer text
    """
    # Build prompt based on question type
    if question_type in ["single", "multiple"] and options:
        options_text = "\n".join(options)
        prompt = f"""这是一道{
            '单选题' if question_type == 'single' else '多选题'
        }，但文档中没有提供答案。请根据题目内容，推理出最可能的正确答案。

题目：{question_content}

选项：
{options_text}

请只返回你认为正确的选项字母（如 A 或 AB），不要有其他解释。如果无法确定，请返回"无法确定"。"""
    elif question_type == "judge":
        prompt = f"""这是一道判断题，但文档中没有提供答案。请根据题目内容，判断正误。

题目：{question_content}

请只返回"对"或"错"，不要有其他解释。如果无法确定，请返回"无法确定"。"""
    else:  # short answer
        prompt = f"""这是一道简答题，但文档中没有提供答案。请根据题目内容，给出一个简洁的参考答案（50字以内）。

题目：{question_content}

请直接返回答案内容，不要有"答案："等前缀。如果无法回答，请返回"无法确定"。"""

    # Generate answer using LLM
    if llm_service.provider == "gemini":
        # Use REST API for Gemini
        url = f"{llm_service.gemini_base_url}/v1beta/models/{llm_service.model}:generateContent"
        headers = {"Content-Type": "application/json"}
        params = {"key": llm_service.gemini_api_key}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        response = await llm_service.client.post(url, headers=headers, params=params, json=payload)
        response.raise_for_status()
        response_data = response.json()
        return response_data["candidates"][0]["content"]["parts"][0]["text"].strip()
    elif llm_service.provider == "anthropic":
        response = await llm_service.client.messages.create(
            model=llm_service.model,
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    else:  # OpenAI or Qwen
        response = await llm_service.client.chat.completions.create(
            model=llm_service.model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides concise answers."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=256
        )
        return response.choices[0].message.content.strip()


async def process_questions_with_dedup(
    exam_id: int,
    questions_data: List[dict],
    db: AsyncSession,
    llm_service=None
) -> ParseResult:
    """
    Process parsed questions with fuzzy deduplication logic.

    Uses a two-stage deduplication strategy:
    1. Fast exact hash matching (for 100% identical questions)
    2. Fuzzy similarity matching (for AI-generated variations)

    Args:
        exam_id: Target exam ID
        questions_data: List of question dicts from LLM parsing
        db: Database session
        llm_service: LLM service instance for generating AI answers

    Returns:
        ParseResult with statistics
    """
    total_parsed = len(questions_data)
    duplicates_removed = 0
    new_added = 0
    ai_answers_generated = 0

    # Get existing questions for this exam (content for fuzzy matching)
    result = await db.execute(
        select(Question.content, Question.content_hash).where(Question.exam_id == exam_id)
    )
    existing_questions_db = result.all()
    existing_hashes = set(row[1] for row in existing_questions_db)
    existing_questions = [{"content": row[0]} for row in existing_questions_db]

    print(f"[Dedup] Checking against {len(existing_questions)} existing questions in database")

    # Insert only new questions
    for q_data in questions_data:
        content_hash = q_data.get("content_hash")

        # Stage 1: Fast exact hash matching
        if content_hash in existing_hashes:
            duplicates_removed += 1
            print(f"[Dedup] Exact hash match - skipping", flush=True)
            continue

        # Stage 2: Fuzzy similarity matching (only if hash didn't match)
        if is_duplicate_question(q_data, existing_questions, threshold=0.85):
            duplicates_removed += 1
            continue

        # Handle missing answers - generate AI reference answer
        answer = q_data.get("answer")
        if (answer is None or answer == "null" or answer == "") and llm_service:
            print(f"[Question] Generating AI reference answer for: {q_data['content'][:50]}...", flush=True)
            try:
                # Convert question type to string if it's not already
                q_type = q_data["type"]
                if hasattr(q_type, 'value'):
                    q_type = q_type.value
                elif isinstance(q_type, str):
                    q_type = q_type.lower()

                ai_answer = await generate_ai_reference_answer(
                    llm_service,
                    q_data["content"],
                    q_type,
                    q_data.get("options")
                )
                answer = f"AI参考答案：{ai_answer}"
                ai_answers_generated += 1
                print(f"[Question] ✅ AI answer generated: {ai_answer[:50]}...", flush=True)
            except Exception as e:
                print(f"[Question] ⚠️ Failed to generate AI answer: {e}", flush=True)
                answer = "（答案未提供）"
        elif answer is None or answer == "null" or answer == "":
            answer = "（答案未提供）"

        # Create new question
        new_question = Question(
            exam_id=exam_id,
            content=q_data["content"],
            type=q_data["type"],
            options=q_data.get("options"),
            answer=answer,
            analysis=q_data.get("analysis"),
            content_hash=content_hash
        )
        db.add(new_question)
        existing_hashes.add(content_hash)  # Prevent exact duplicates in current batch
        existing_questions.append({"content": q_data["content"]})  # Prevent fuzzy duplicates in current batch
        new_added += 1

    await db.commit()

    message = f"Parsed {total_parsed} questions, removed {duplicates_removed} duplicates, added {new_added} new questions"
    if ai_answers_generated > 0:
        message += f", generated {ai_answers_generated} AI reference answers"

    return ParseResult(
        total_parsed=total_parsed,
        duplicates_removed=duplicates_removed,
        new_added=new_added,
        message=message
    )


async def async_parse_and_save(
    exam_id: int,
    file_content: bytes,
    filename: str,
    db_url: str
):
    """
    Background task to parse document and save questions with deduplication.
    Sends real-time progress updates via SSE.
    """
    from database import AsyncSessionLocal
    from sqlalchemy import select
    from services.progress_service import ProgressUpdate, ProgressStatus

    async with AsyncSessionLocal() as db:
        try:
            # Update exam status to processing
            result = await db.execute(select(Exam).where(Exam.id == exam_id))
            exam = result.scalar_one()
            exam.status = ExamStatus.PROCESSING
            await db.commit()

            # Send initial progress
            await progress_service.update_progress(ProgressUpdate(
                exam_id=exam_id,
                status=ProgressStatus.PARSING,
                message="开始解析文档...",
                progress=5.0
            ))

            # Load LLM configuration from database
            llm_config = await load_llm_config(db)
            llm_service = LLMService(config=llm_config)

            # Check if file is PDF and provider is Gemini
            is_pdf = filename.lower().endswith('.pdf')
            is_gemini = llm_config.get('ai_provider') == 'gemini'

            print(f"[Exam {exam_id}] Parsing document: {filename}")
            print(f"[Exam {exam_id}] File type: {'PDF' if is_pdf else 'Text-based'}", flush=True)
            print(f"[Exam {exam_id}] AI Provider: {llm_config.get('ai_provider')}", flush=True)

            try:
                if is_pdf and is_gemini:
                    # Use Gemini's native PDF processing
                    print(f"[Exam {exam_id}] Using Gemini native PDF processing", flush=True)
                    print(f"[Exam {exam_id}] PDF file size: {len(file_content)} bytes", flush=True)

                    await progress_service.update_progress(ProgressUpdate(
                        exam_id=exam_id,
                        status=ProgressStatus.PARSING,
                        message="使用Gemini解析PDF文档...",
                        progress=10.0
                    ))

                    questions_data = await llm_service.parse_document_with_pdf(file_content, filename, exam_id)
                else:
                    # Extract text first, then parse
                    if is_pdf:
                        print(f"[Exam {exam_id}] ⚠️ Warning: Using text extraction for PDF (provider does not support native PDF)", flush=True)

                    await progress_service.update_progress(ProgressUpdate(
                        exam_id=exam_id,
                        status=ProgressStatus.PARSING,
                        message="提取文档文本内容...",
                        progress=10.0
                    ))

                    print(f"[Exam {exam_id}] Extracting text from document...", flush=True)
                    text_content = await document_parser.parse_file(file_content, filename)

                    if not text_content or len(text_content.strip()) < 10:
                        raise Exception("Document appears to be empty or too short")

                    print(f"[Exam {exam_id}] Text content length: {len(text_content)} chars", flush=True)

                    # Check if document is too long and needs splitting
                    if len(text_content) > 5000:
                        text_chunks = document_parser.split_text_with_overlap(text_content, chunk_size=3000, overlap=1000)
                        total_chunks = len(text_chunks)

                        print(f"[Exam {exam_id}] Document is long, splitting into chunks...", flush=True)
                        print(f"[Exam {exam_id}] Split into {total_chunks} chunks", flush=True)

                        await progress_service.update_progress(ProgressUpdate(
                            exam_id=exam_id,
                            status=ProgressStatus.SPLITTING,
                            message=f"文档已拆分为 {total_chunks} 个部分",
                            progress=15.0,
                            total_chunks=total_chunks
                        ))

                        all_questions = []

                        for chunk_idx, chunk in enumerate(text_chunks):
                            current_chunk = chunk_idx + 1
                            chunk_progress = 15.0 + (60.0 * current_chunk / total_chunks)

                            await progress_service.update_progress(ProgressUpdate(
                                exam_id=exam_id,
                                status=ProgressStatus.PROCESSING_CHUNK,
                                message=f"正在处理第 {current_chunk}/{total_chunks} 部分...",
                                progress=chunk_progress,
                                total_chunks=total_chunks,
                                current_chunk=current_chunk,
                                questions_extracted=len(all_questions)
                            ))

                            print(f"[Exam {exam_id}] Processing chunk {current_chunk}/{total_chunks}...", flush=True)
                            try:
                                chunk_questions = await llm_service.parse_document(chunk)
                                print(f"[Exam {exam_id}] Chunk {current_chunk} extracted {len(chunk_questions)} questions", flush=True)

                                # Fuzzy deduplicate across chunks
                                for q in chunk_questions:
                                    # Use fuzzy matching to check for duplicates
                                    if not is_duplicate_question(q, all_questions, threshold=0.85):
                                        all_questions.append(q)
                                    else:
                                        print(f"[Exam {exam_id}] Skipped fuzzy duplicate from chunk {current_chunk}", flush=True)

                            except Exception as chunk_error:
                                print(f"[Exam {exam_id}] Chunk {chunk_idx + 1} failed: {str(chunk_error)}", flush=True)
                                continue

                        questions_data = all_questions
                        print(f"[Exam {exam_id}] Total questions after fuzzy deduplication: {len(questions_data)}", flush=True)

                        await progress_service.update_progress(ProgressUpdate(
                            exam_id=exam_id,
                            status=ProgressStatus.DEDUPLICATING,
                            message=f"所有部分处理完成，提取了 {len(questions_data)} 个题目",
                            progress=75.0,
                            total_chunks=total_chunks,
                            current_chunk=total_chunks,
                            questions_extracted=len(questions_data)
                        ))
                    else:
                        print(f"[Exam {exam_id}] Document content preview:\n{text_content[:500]}\n{'...' if len(text_content) > 500 else ''}", flush=True)
                        print(f"[Exam {exam_id}] Calling LLM to extract questions...", flush=True)

                        await progress_service.update_progress(ProgressUpdate(
                            exam_id=exam_id,
                            status=ProgressStatus.PARSING,
                            message="正在提取题目...",
                            progress=30.0
                        ))

                        questions_data = await llm_service.parse_document(text_content)

                        await progress_service.update_progress(ProgressUpdate(
                            exam_id=exam_id,
                            status=ProgressStatus.DEDUPLICATING,
                            message=f"提取了 {len(questions_data)} 个题目",
                            progress=60.0,
                            questions_extracted=len(questions_data)
                        ))

            except Exception as parse_error:
                print(f"[Exam {exam_id}] ⚠️ Parse error details: {type(parse_error).__name__}", flush=True)
                print(f"[Exam {exam_id}] ⚠️ Parse error message: {str(parse_error)}", flush=True)
                import traceback
                print(f"[Exam {exam_id}] ⚠️ Full traceback:\n{traceback.format_exc()}", flush=True)
                raise

            if not questions_data:
                raise Exception("No questions found in document")

            # Process questions with deduplication and AI answer generation
            await progress_service.update_progress(ProgressUpdate(
                exam_id=exam_id,
                status=ProgressStatus.SAVING,
                message="正在去重并保存题目到数据库...",
                progress=80.0,
                questions_extracted=len(questions_data)
            ))

            print(f"[Exam {exam_id}] Processing questions with deduplication...")
            parse_result = await process_questions_with_dedup(exam_id, questions_data, db, llm_service)

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

            # Send completion progress
            await progress_service.update_progress(ProgressUpdate(
                exam_id=exam_id,
                status=ProgressStatus.COMPLETED,
                message=f"完成！添加了 {parse_result.new_added} 个题目（去重 {parse_result.duplicates_removed} 个）",
                progress=100.0,
                questions_extracted=parse_result.total_parsed,
                questions_added=parse_result.new_added,
                duplicates_removed=parse_result.duplicates_removed
            ))

        except Exception as e:
            print(f"[Exam {exam_id}] ❌ Error: {str(e)}")

            # Send error progress
            await progress_service.update_progress(ProgressUpdate(
                exam_id=exam_id,
                status=ProgressStatus.FAILED,
                message=f"处理失败：{str(e)}",
                progress=0.0
            ))

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


@router.get("/{exam_id}/progress")
async def get_exam_progress(
    exam_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time progress updates for exam document parsing (SSE endpoint)

    Returns Server-Sent Events stream with progress updates
    """
    # Authenticate using token from query parameter (EventSource doesn't support custom headers)
    from services.auth_service import get_current_user_from_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token required"
        )

    try:
        current_user = await get_current_user_from_token(token, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # Verify exam belongs to user
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

    async def event_generator():
        """Generate SSE events"""
        async for update in progress_service.subscribe(exam_id):
            # Format as SSE
            data = json.dumps(update.to_dict())
            yield f"data: {data}\n\n"

            # Stop if completed or failed
            if update.status in ["completed", "failed"]:
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


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
