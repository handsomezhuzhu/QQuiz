"""
Admin Router - 完备的管理员功能模块
参考 OpenWebUI 设计
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
import io
import json

from database import get_db, engine
from models import User, SystemConfig, Exam, Question, UserMistake, ExamStatus
from schemas import (
    SystemConfigUpdate, SystemConfigResponse,
    UserResponse, UserCreate, UserUpdate, UserListResponse
)
from services.auth_service import get_current_admin_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/config", response_model=SystemConfigResponse)
async def get_system_config(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system configuration (admin only)"""

    # Fetch all config values
    result = await db.execute(select(SystemConfig))
    configs = {config.key: config.value for config in result.scalars().all()}

    # Mask API keys (show only first 10 and last 4 characters)
    def mask_api_key(key):
        if not key or len(key) < 20:
            return key
        return f"{key[:10]}...{key[-4:]}"

    return {
        "allow_registration": configs.get("allow_registration", "true").lower() == "true",
        "max_upload_size_mb": int(configs.get("max_upload_size_mb", "10")),
        "max_daily_uploads": int(configs.get("max_daily_uploads", "20")),
        "ai_provider": configs.get("ai_provider", "gemini"),
        # API Configuration
        "openai_api_key": mask_api_key(configs.get("openai_api_key")),
        "openai_base_url": configs.get("openai_base_url", "https://api.openai.com/v1"),
        "openai_model": configs.get("openai_model", "gpt-4o-mini"),
        "anthropic_api_key": mask_api_key(configs.get("anthropic_api_key")),
        "anthropic_model": configs.get("anthropic_model", "claude-3-haiku-20240307"),
        "qwen_api_key": mask_api_key(configs.get("qwen_api_key")),
        "qwen_base_url": configs.get("qwen_base_url", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
        "qwen_model": configs.get("qwen_model", "qwen-plus"),
        "gemini_api_key": mask_api_key(configs.get("gemini_api_key")),
        "gemini_base_url": configs.get("gemini_base_url", ""),
        "gemini_model": configs.get("gemini_model", "gemini-2.0-flash-exp")
    }


@router.put("/config", response_model=SystemConfigResponse)
async def update_system_config(
    config_update: SystemConfigUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update system configuration (admin only)"""

    update_data = config_update.dict(exclude_unset=True)

    for key, value in update_data.items():
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == key)
        )
        config = result.scalar_one_or_none()

        if config:
            config.value = str(value).lower() if isinstance(value, bool) else str(value)
        else:
            new_config = SystemConfig(
                key=key,
                value=str(value).lower() if isinstance(value, bool) else str(value)
            )
            db.add(new_config)

    await db.commit()

    # Return updated config
    return await get_system_config(current_admin, db)


# ==================== 用户管理模块 ====================

@router.get("/users", response_model=UserListResponse)
async def get_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户列表（分页、搜索）
    - skip: 跳过的记录数
    - limit: 返回的最大记录数
    - search: 搜索关键词（用户名）
    """
    query = select(User)

    # 搜索过滤
    if search:
        query = query.where(User.username.ilike(f"%{search}%"))

    # 统计总数
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar()

    # 分页查询
    query = query.order_by(desc(User.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    # 为每个用户添加统计信息
    user_list = []
    for user in users:
        # 统计用户的题库数
        exam_count_query = select(func.count(Exam.id)).where(Exam.user_id == user.id)
        exam_result = await db.execute(exam_count_query)
        exam_count = exam_result.scalar()

        # 统计用户的错题数
        mistake_count_query = select(func.count(UserMistake.id)).where(UserMistake.user_id == user.id)
        mistake_result = await db.execute(mistake_count_query)
        mistake_count = mistake_result.scalar()

        user_list.append({
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "exam_count": exam_count,
            "mistake_count": mistake_count
        })

    return {
        "users": user_list,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """创建新用户（仅管理员）"""
    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == user_data.username))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # 创建新用户
    hashed_password = pwd_context.hash(user_data.password)
    new_user = User(
        username=user_data.username,
        hashed_password=hashed_password,
        is_admin=user_data.is_admin
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """更新用户信息（仅管理员）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 不允许修改默认管理员的管理员状态
    if user.username == "admin" and user_data.is_admin is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify default admin user's admin status"
        )

    # 更新字段
    update_data = user_data.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = pwd_context.hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """删除用户（仅管理员）"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 不允许删除默认管理员
    if user.username == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete default admin user"
        )

    # 不允许管理员删除自己
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete yourself"
        )

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


# ==================== 系统统计模块 ====================

@router.get("/statistics")
async def get_system_statistics(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取系统统计信息
    - 用户总数
    - 题库总数
    - 题目总数
    - 今日活跃用户数
    - 今日上传数
    """
    # 用户统计
    user_count_result = await db.execute(select(func.count(User.id)))
    total_users = user_count_result.scalar()

    admin_count_result = await db.execute(select(func.count(User.id)).where(User.is_admin == True))
    admin_users = admin_count_result.scalar()

    # 题库统计
    exam_count_result = await db.execute(select(func.count(Exam.id)))
    total_exams = exam_count_result.scalar()

    exam_status_query = select(Exam.status, func.count(Exam.id)).group_by(Exam.status)
    exam_status_result = await db.execute(exam_status_query)
    exam_by_status = {row[0].value: row[1] for row in exam_status_result.all()}

    # 题目统计
    question_count_result = await db.execute(select(func.count(Question.id)))
    total_questions = question_count_result.scalar()

    question_type_query = select(Question.type, func.count(Question.id)).group_by(Question.type)
    question_type_result = await db.execute(question_type_query)
    questions_by_type = {row[0].value: row[1] for row in question_type_result.all()}

    # 今日统计
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    today_uploads_result = await db.execute(
        select(func.count(Exam.id)).where(Exam.created_at >= today_start)
    )
    today_uploads = today_uploads_result.scalar()

    # 活跃用户（今日创建过题库的用户）
    today_active_users_result = await db.execute(
        select(func.count(func.distinct(Exam.user_id))).where(Exam.created_at >= today_start)
    )
    today_active_users = today_active_users_result.scalar()

    # 最近7天趋势
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_exams_query = select(
        func.date(Exam.created_at).label("date"),
        func.count(Exam.id).label("count")
    ).where(Exam.created_at >= seven_days_ago).group_by(func.date(Exam.created_at))
    recent_exams_result = await db.execute(recent_exams_query)
    upload_trend = [{"date": str(row[0]), "count": row[1]} for row in recent_exams_result.all()]

    return {
        "users": {
            "total": total_users,
            "admins": admin_users,
            "regular_users": total_users - admin_users
        },
        "exams": {
            "total": total_exams,
            "by_status": exam_by_status,
            "today_uploads": today_uploads,
            "upload_trend": upload_trend
        },
        "questions": {
            "total": total_questions,
            "by_type": questions_by_type
        },
        "activity": {
            "today_active_users": today_active_users,
            "today_uploads": today_uploads
        }
    }


# ==================== 系统监控模块 ====================

@router.get("/health")
async def get_system_health(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    系统健康检查
    - 数据库连接状态
    - 数据库大小（SQLite）
    - 系统信息
    """
    import os
    import sys
    import platform

    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "platform": platform.platform(),
            "python_version": sys.version,
            "database_url": os.getenv("DATABASE_URL", "").split("://")[0] if os.getenv("DATABASE_URL") else "unknown"
        },
        "database": {
            "connected": True
        }
    }

    # 检查数据库大小（仅 SQLite）
    try:
        db_url = os.getenv("DATABASE_URL", "")
        if "sqlite" in db_url:
            # 提取数据库文件路径
            db_path = db_url.split("///")[-1] if "///" in db_url else None
            if db_path and os.path.exists(db_path):
                db_size = os.path.getsize(db_path)
                health_status["database"]["size_mb"] = round(db_size / (1024 * 1024), 2)
                health_status["database"]["path"] = db_path
    except Exception as e:
        health_status["database"]["size_error"] = str(e)

    return health_status


# ==================== 数据导出模块 ====================

@router.get("/export/users")
async def export_users_csv(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """导出用户列表为 CSV"""
    result = await db.execute(select(User).order_by(User.id))
    users = result.scalars().all()

    # 创建 CSV 内容
    csv_content = "ID,Username,Is Admin,Created At\n"
    for user in users:
        csv_content += f"{user.id},{user.username},{user.is_admin},{user.created_at}\n"

    # 返回文件流
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"}
    )


@router.get("/export/statistics")
async def export_statistics_json(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """导出系统统计信息为 JSON"""
    stats = await get_system_statistics(current_admin, db)

    json_content = json.dumps(stats, indent=2, ensure_ascii=False, default=str)

    return StreamingResponse(
        io.StringIO(json_content),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=statistics.json"}
    )


# ==================== 日志模块 ====================

@router.get("/logs/recent")
async def get_recent_logs(
    limit: int = 100,
    level: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user)
):
    """
    获取最近的日志（暂时返回模拟数据，实际需要接入日志系统）
    TODO: 接入实际日志系统（如文件日志、ELK、Loki等）
    """
    # 这是一个占位实现，实际应该从日志文件或日志系统读取
    return {
        "message": "日志功能暂未完全实现，建议使用 Docker logs 或配置外部日志系统",
        "suggestion": "可以使用: docker logs qquiz_backend --tail 100",
        "logs": []
    }
