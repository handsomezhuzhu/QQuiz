"""
Progress Service - Manages document parsing progress for real-time updates
"""
import asyncio
from typing import Dict, Optional, AsyncGenerator
from datetime import datetime
from enum import Enum


class ProgressStatus(str, Enum):
    """Progress status types"""
    PENDING = "pending"
    PARSING = "parsing"
    SPLITTING = "splitting"
    PROCESSING_CHUNK = "processing_chunk"
    DEDUPLICATING = "deduplicating"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"


class ProgressUpdate:
    """Progress update data structure"""
    def __init__(
        self,
        exam_id: int,
        status: ProgressStatus,
        message: str,
        progress: float = 0.0,
        total_chunks: int = 0,
        current_chunk: int = 0,
        questions_extracted: int = 0,
        questions_added: int = 0,
        duplicates_removed: int = 0
    ):
        self.exam_id = exam_id
        self.status = status
        self.message = message
        self.progress = progress  # 0-100
        self.total_chunks = total_chunks
        self.current_chunk = current_chunk
        self.questions_extracted = questions_extracted
        self.questions_added = questions_added
        self.duplicates_removed = duplicates_removed
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "exam_id": self.exam_id,
            "status": self.status.value,
            "message": self.message,
            "progress": round(self.progress, 1),
            "total_chunks": self.total_chunks,
            "current_chunk": self.current_chunk,
            "questions_extracted": self.questions_extracted,
            "questions_added": self.questions_added,
            "duplicates_removed": self.duplicates_removed,
            "timestamp": self.timestamp
        }


class ProgressService:
    """Service for managing parsing progress"""

    def __init__(self):
        # Store progress updates for each exam
        self._progress: Dict[int, ProgressUpdate] = {}
        # Store queues for SSE connections
        self._queues: Dict[int, list] = {}

    async def update_progress(self, update: ProgressUpdate):
        """
        Update progress for an exam and notify all listeners

        Args:
            update: Progress update object
        """
        exam_id = update.exam_id
        self._progress[exam_id] = update

        # Send to all connected SSE clients for this exam
        if exam_id in self._queues:
            dead_queues = []
            for queue in self._queues[exam_id]:
                try:
                    await queue.put(update)
                except Exception as e:
                    print(f"[Progress] Failed to send update to queue: {e}")
                    dead_queues.append(queue)

            # Clean up dead queues
            for dead_queue in dead_queues:
                self._queues[exam_id].remove(dead_queue)

    def get_progress(self, exam_id: int) -> Optional[ProgressUpdate]:
        """Get current progress for an exam"""
        return self._progress.get(exam_id)

    async def subscribe(self, exam_id: int) -> AsyncGenerator[ProgressUpdate, None]:
        """
        Subscribe to progress updates for an exam (SSE stream)

        Args:
            exam_id: Exam ID to subscribe to

        Yields:
            Progress updates as they occur
        """
        # Create a queue for this connection
        queue = asyncio.Queue()

        # Register the queue
        if exam_id not in self._queues:
            self._queues[exam_id] = []
        self._queues[exam_id].append(queue)

        try:
            # Send current progress if exists
            current_progress = self.get_progress(exam_id)
            if current_progress:
                yield current_progress

            # Stream updates
            while True:
                update = await queue.get()
                yield update

                # Stop streaming if completed or failed
                if update.status in [ProgressStatus.COMPLETED, ProgressStatus.FAILED]:
                    break

        finally:
            # Cleanup
            if exam_id in self._queues and queue in self._queues[exam_id]:
                self._queues[exam_id].remove(queue)
                if not self._queues[exam_id]:
                    del self._queues[exam_id]

    def clear_progress(self, exam_id: int):
        """Clear progress data for an exam"""
        if exam_id in self._progress:
            del self._progress[exam_id]
        if exam_id in self._queues:
            del self._queues[exam_id]


# Singleton instance
progress_service = ProgressService()
