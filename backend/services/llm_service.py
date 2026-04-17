"""
LLM Service for AI-powered question parsing and grading
"""
import os
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import httpx

from models import QuestionType
from utils import calculate_content_hash


class LLMService:
    """Service for interacting with various LLM providers"""

    @staticmethod
    def _normalize_openai_base_url(base_url: Optional[str], default: str) -> str:
        normalized = (base_url or default).rstrip("/")
        if normalized.endswith("/v1"):
            return normalized

        if normalized.count("/") <= 2:
            return f"{normalized}/v1"

        return normalized

    @staticmethod
    def _openai_compat_headers() -> Dict[str, str]:
        """
        Some OpenAI-compatible gateways block the default OpenAI SDK user agent.
        Use a neutral UA so requests behave like a generic HTTP client.
        """
        return {"User-Agent": "QQuiz/1.0"}

    def __init__(self, config: Optional[Dict[str, str]] = None):
        """
        Initialize LLM Service with optional configuration.
        If config is not provided, falls back to environment variables.

        Args:
            config: Dictionary with keys like 'ai_provider', 'openai_api_key', etc.
        """
        # Get provider from config or environment
        self.provider = (config or {}).get("ai_provider") or os.getenv("AI_PROVIDER", "openai")

        if self.provider == "openai":
            api_key = (config or {}).get("openai_api_key") or os.getenv("OPENAI_API_KEY")
            base_url = self._normalize_openai_base_url(
                (config or {}).get("openai_base_url") or os.getenv("OPENAI_BASE_URL"),
                "https://api.openai.com/v1"
            )
            self.model = (config or {}).get("openai_model") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

            if not api_key:
                raise ValueError("OpenAI API key not configured")

            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url=base_url,
                default_headers=self._openai_compat_headers(),
                timeout=120.0,  # 增加超时时间到 120 秒
                max_retries=3   # 自动重试 3 次
            )

            # Log configuration for debugging
            print(f"[LLM Config] Provider: OpenAI", flush=True)
            print(f"[LLM Config] Base URL: {base_url}", flush=True)
            print(f"[LLM Config] Model: {self.model}", flush=True)
            print(f"[LLM Config] API Key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else 'xxxx'}", flush=True)

        elif self.provider == "anthropic":
            api_key = (config or {}).get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
            self.model = (config or {}).get("anthropic_model") or os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")

            if not api_key:
                raise ValueError("Anthropic API key not configured")

            self.client = AsyncAnthropic(
                api_key=api_key
            )

        elif self.provider == "qwen":
            api_key = (config or {}).get("qwen_api_key") or os.getenv("QWEN_API_KEY")
            base_url = (config or {}).get("qwen_base_url") or os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
            self.model = (config or {}).get("qwen_model") or os.getenv("QWEN_MODEL", "qwen-plus")

            if not api_key:
                raise ValueError("Qwen API key not configured")

            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url=base_url,
                default_headers=self._openai_compat_headers(),
                timeout=120.0,  # 增加超时时间到 120 秒
                max_retries=3   # 自动重试 3 次
            )

        elif self.provider == "gemini":
            api_key = (config or {}).get("gemini_api_key") or os.getenv("GEMINI_API_KEY")
            base_url = (config or {}).get("gemini_base_url") or os.getenv("GEMINI_BASE_URL")
            self.model = (config or {}).get("gemini_model") or os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

            if not api_key:
                raise ValueError("Gemini API key not configured")

            # Store Gemini configuration for REST API calls
            self.gemini_api_key = api_key
            self.gemini_base_url = base_url or "https://generativelanguage.googleapis.com"

            # Create httpx client for REST API calls (instead of SDK)
            self.client = httpx.AsyncClient(
                timeout=120.0,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )

            # Log configuration for debugging
            print(f"[LLM Config] Provider: Gemini (REST API)", flush=True)
            print(f"[LLM Config] Model: {self.model}", flush=True)
            print(f"[LLM Config] Base URL: {self.gemini_base_url}", flush=True)
            print(f"[LLM Config] API Key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else 'xxxx'}", flush=True)

        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def parse_document(self, content: str) -> List[Dict[str, Any]]:
        """
        Parse document content and extract questions.

        Returns a list of dictionaries with question data:
        [
            {
                "content": "Question text",
                "type": "single/multiple/judge/short",
                "options": ["A. Option1", "B. Option2", ...],  # For choice questions
                "answer": "Correct answer",
                "analysis": "Explanation"
            },
            ...
        ]
        """
        prompt = """你是一个专业的试题解析专家。请仔细分析下面的文档内容，提取其中的所有试题。

**识别规则**：
- 文档中可能包含中文或英文题目
- 题目可能有多种格式，请灵活识别
- **重要**：只提取完整的题目，忽略任何不完整的题目（题目被截断、缺少选项、缺少关键信息等）
- 如果题目看起来不完整（比如开头或结尾被切断），直接跳过该题目
- 如果文档只是普通文章而没有题目，请返回空数组 []

**题目类型识别** (严格使用以下4种类型之一)：
1. **single** - 单选题：只有一个正确答案的选择题
2. **multiple** - 多选题：有多个正确答案的选择题（答案格式如：AB、ABC、ACD等）
3. **judge** - 判断题：对错/是非/True False题目
4. **short** - 简答题：包括问答、计算、证明、填空、编程等所有非选择题

**多选题识别关键词**：
- 明确标注"多选"、"多项选择"、"Multiple Choice"
- 题干中包含"可能"、"正确的有"、"包括"等
- 答案是多个字母组合（如：ABC、BD、ABCD）

**每道题目提取字段**：
1. **content**: 完整的题目文字（去除题号）
2. **type**: 题目类型（single/multiple/judge/short）
3. **options**: 选项数组（仅选择题，格式: ["A. 选项1", "B. 选项2", ...]）
4. **answer**: 正确答案
   - 单选题: 单个字母 (如 "A"、"B")
   - 多选题: 多个字母无空格 (如 "AB"、"ABC"、"BD")
   - 判断题: "对"/"错"、"正确"/"错误"、"True"/"False"
   - 简答题: 完整答案文本，如果没有答案填 null
5. **analysis**: 解析说明（如果有）

**JSON 格式要求**：
- 必须返回一个完整的 JSON 数组 (以 [ 开始，以 ] 结束)
- 不要包含 markdown 代码块标记 (```json 或 ```)
- 不要包含任何解释性文字
- 字符串中的特殊字符必须正确转义（换行用 \\n，引号用 \\"，反斜杠用 \\\\）
- 不要在字符串值中使用未转义的控制字符

**返回格式示例**：
[
  {{
    "content": "下列关于Python的描述，正确的是",
    "type": "single",
    "options": ["A. Python是编译型语言", "B. Python支持面向对象编程", "C. Python不支持函数式编程", "D. Python只能用于Web开发"],
    "answer": "B",
    "analysis": "Python是解释型语言，支持多种编程范式"
  }},
  {{
    "content": "以下哪些是Python的优点（多选）",
    "type": "multiple",
    "options": ["A. 语法简洁", "B. 库丰富", "C. 执行速度最快", "D. 易于学习"],
    "answer": "ABD",
    "analysis": "Python优点是语法简洁、库丰富、易学，但执行速度不是最快的"
  }},
  {{
    "content": "Python是一种高级编程语言",
    "type": "judge",
    "options": [],
    "answer": "对",
    "analysis": null
  }},
  {{
    "content": "请解释Python中的装饰器是什么",
    "type": "short",
    "options": [],
    "answer": "装饰器是Python中一种特殊的函数，用于修改其他函数的行为...",
    "analysis": null
  }}
]

**文档内容**：
---
{content}
---

**最后提醒**：
- 仔细识别多选题（看题干、看答案格式）
- 单选和多选容易混淆，请特别注意区分
- 如果文档中没有题目，返回 []
- 只返回 JSON 数组，不要有任何其他内容"""

        try:
            if self.provider == "anthropic":
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    messages=[
                        {"role": "user", "content": prompt.format(content=content)}
                    ]
                )
                result = response.content[0].text
            elif self.provider == "gemini":
                # Gemini uses REST API
                print(f"[Gemini Text] Calling Gemini REST API with model: {self.model}", flush=True)

                url = f"{self.gemini_base_url}/v1beta/models/{self.model}:generateContent"
                headers = {"Content-Type": "application/json"}
                params = {"key": self.gemini_api_key}
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt.format(content=content)}]
                    }]
                }

                response = await self.client.post(url, headers=headers, params=params, json=payload)
                response.raise_for_status()
                response_data = response.json()

                # Extract text from response
                result = response_data["candidates"][0]["content"]["parts"][0]["text"]
                print(f"[Gemini Text] API call completed", flush=True)
            else:  # OpenAI or Qwen
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a professional question parser. Return only JSON."},
                        {"role": "user", "content": prompt.format(content=content)}
                    ],
                    temperature=0.3,
                )
                result = response.choices[0].message.content

            # Log original response for debugging
            import sys
            print(f"[LLM Raw Response] Length: {len(result)} chars", flush=True)
            print(f"[LLM Raw Response] First 300 chars:\n{result[:300]}", flush=True)
            print(f"[LLM Raw Response] Last 200 chars:\n{result[-200:]}", flush=True)
            sys.stdout.flush()

            # Clean result and parse JSON
            result = result.strip()

            # Remove markdown code blocks
            if result.startswith("```json"):
                result = result[7:]
            elif result.startswith("```"):
                result = result[3:]

            if result.endswith("```"):
                result = result[:-3]

            result = result.strip()

            # Try to find JSON array if there's extra text
            if not result.startswith('['):
                # Find the first '[' character
                start_idx = result.find('[')
                if start_idx != -1:
                    print(f"[JSON Cleanup] Found '[' at position {start_idx}, extracting array...")
                    result = result[start_idx:]
                else:
                    print(f"[JSON Error] No '[' found in response!")
                    raise Exception("LLM response does not contain a JSON array")

            if not result.endswith(']'):
                # Find the last ']' character
                end_idx = result.rfind(']')
                if end_idx != -1:
                    print(f"[JSON Cleanup] Found last ']' at position {end_idx}")
                    result = result[:end_idx + 1]

            result = result.strip()

            # Additional cleanup: fix common JSON issues
            # 1. Remove trailing commas before closing brackets
            import re
            result = re.sub(r',(\s*[}\]])', r'\1', result)

            # 2. Fix unescaped quotes in string values (basic attempt)
            # This is tricky and may not catch all cases, but helps with common issues

            # Log the cleaned result for debugging
            print(f"[LLM Cleaned JSON] Length: {len(result)} chars")
            print(f"[LLM Cleaned JSON] First 300 chars:\n{result[:300]}")

            try:
                questions = json.loads(result)
            except json.JSONDecodeError as je:
                print(f"[JSON Error] Failed to parse JSON at line {je.lineno}, column {je.colno}")
                print(f"[JSON Error] Error: {je.msg}")

                # If error is about control characters, try to fix them
                if "control character" in je.msg.lower() or "invalid \\escape" in je.msg.lower():
                    print(f"[JSON Cleanup] Attempting to fix control characters...", flush=True)

                    # Fix unescaped control characters in JSON string values
                    import re

                    def fix_string_value(match):
                        """Fix control characters inside a JSON string value"""
                        string_content = match.group(1)
                        # Escape control characters
                        string_content = string_content.replace('\n', '\\n')
                        string_content = string_content.replace('\r', '\\r')
                        string_content = string_content.replace('\t', '\\t')
                        string_content = string_content.replace('\b', '\\b')
                        string_content = string_content.replace('\f', '\\f')
                        return f'"{string_content}"'

                    # Match string values in JSON
                    # Pattern matches: "..." (handles escaped quotes and backslashes)
                    # (?:[^"\\]|\\.)* means: either non-quote-non-backslash OR backslash-followed-by-anything, repeated
                    fixed_result = re.sub(r'"((?:[^"\\]|\\.)*)"', fix_string_value, result)

                    print(f"[JSON Cleanup] Retrying with fixed control characters...", flush=True)
                    try:
                        questions = json.loads(fixed_result)
                        print(f"[JSON Cleanup] ✅ Successfully parsed after fixing control characters!", flush=True)
                    except json.JSONDecodeError as je2:
                        print(f"[JSON Error] Still failed after fix: {je2.msg}", flush=True)
                        # Print context around the error
                        lines = result.split('\n')
                        if je.lineno <= len(lines):
                            start = max(0, je.lineno - 3)
                            end = min(len(lines), je.lineno + 2)
                            print(f"[JSON Error] Context (lines {start+1}-{end}):")
                            for i in range(start, end):
                                marker = " >>> " if i == je.lineno - 1 else "     "
                                print(f"{marker}{i+1}: {lines[i]}")
                        raise Exception(f"Invalid JSON format from LLM: {je.msg} at line {je.lineno}")
                else:
                    # Print context around the error
                    lines = result.split('\n')
                    if je.lineno <= len(lines):
                        start = max(0, je.lineno - 3)
                        end = min(len(lines), je.lineno + 2)
                        print(f"[JSON Error] Context (lines {start+1}-{end}):")
                        for i in range(start, end):
                            marker = " >>> " if i == je.lineno - 1 else "     "
                            print(f"{marker}{i+1}: {lines[i]}")
                    raise Exception(f"Invalid JSON format from LLM: {je.msg} at line {je.lineno}")

            # Validate that we got a list
            if not isinstance(questions, list):
                raise Exception(f"Expected a list of questions, got {type(questions)}")

            if len(questions) == 0:
                raise Exception("No questions found in the parsed result")

            # Validate and fix question types
            valid_types = {"single", "multiple", "judge", "short"}
            type_mapping = {
                "proof": "short",
                "essay": "short",
                "calculation": "short",
                "fill": "short",
                "填空": "short",
                "证明": "short",
                "计算": "short",
                "问答": "short",
                "单选": "single",
                "多选": "multiple",
                "判断": "judge",
                "简答": "short"
            }

            # Add content hash and validate types
            for q in questions:
                if "content" not in q:
                    print(f"[Warning] Question missing 'content' field: {q}")
                    continue

                # Validate and fix question type
                q_type = q.get("type", "short")
                if isinstance(q_type, str):
                    q_type_lower = q_type.lower()
                    if q_type_lower not in valid_types:
                        # Try to map to valid type
                        if q_type_lower in type_mapping:
                            old_type = q_type
                            q["type"] = type_mapping[q_type_lower]
                            print(f"[Type Fix] Changed '{old_type}' to '{q['type']}' for question: {q['content'][:50]}...", flush=True)
                        else:
                            # Default to short answer
                            print(f"[Type Fix] Unknown type '{q_type}', defaulting to 'short' for question: {q['content'][:50]}...", flush=True)
                            q["type"] = "short"
                    else:
                        q["type"] = q_type_lower
                else:
                    q["type"] = "short"

                q["content_hash"] = calculate_content_hash(q["content"])

            return questions

        except Exception as e:
            print(f"[Error] Document parsing failed: {str(e)}")
            raise Exception(f"Failed to parse document: {str(e)}")

    def split_pdf_pages(self, pdf_bytes: bytes, pages_per_chunk: int = 4, overlap: int = 1) -> List[bytes]:
        """
        Split PDF into overlapping chunks to handle long documents.

        Args:
            pdf_bytes: PDF file content
            pages_per_chunk: Number of pages per chunk (default: 4)
            overlap: Number of overlapping pages between chunks (default: 1)

        Returns:
            List of PDF chunks as bytes
        """
        import PyPDF2
        import io

        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        total_pages = len(pdf_reader.pages)

        # If PDF is small, don't split
        if total_pages <= pages_per_chunk:
            return [pdf_bytes]

        print(f"[PDF Split] Total pages: {total_pages}, splitting into chunks of {pages_per_chunk} pages with {overlap} page overlap")

        chunks = []
        start = 0

        while start < total_pages:
            end = min(start + pages_per_chunk, total_pages)

            # Create a new PDF with pages [start, end)
            pdf_writer = PyPDF2.PdfWriter()
            for page_num in range(start, end):
                pdf_writer.add_page(pdf_reader.pages[page_num])

            # Write to bytes
            chunk_bytes = io.BytesIO()
            pdf_writer.write(chunk_bytes)
            chunk_bytes.seek(0)
            chunks.append(chunk_bytes.getvalue())

            print(f"[PDF Split] Chunk {len(chunks)}: pages {start+1}-{end}")

            # Move to next chunk with overlap
            start = end - overlap if end < total_pages else total_pages

        return chunks

    async def parse_document_with_pdf(self, pdf_bytes: bytes, filename: str, exam_id: int = None) -> List[Dict[str, Any]]:
        """
        Parse PDF document using Gemini's native PDF understanding.
        Automatically splits large PDFs into overlapping chunks.
        Only works with Gemini provider.

        Args:
            pdf_bytes: PDF file content as bytes
            filename: Original filename for logging
            exam_id: Optional exam ID for progress updates

        Returns:
            List of question dictionaries
        """
        if self.provider != "gemini":
            raise ValueError("PDF parsing is only supported with Gemini provider")

        # Split PDF into chunks
        pdf_chunks = self.split_pdf_pages(pdf_bytes, pages_per_chunk=4, overlap=1)
        total_chunks = len(pdf_chunks)

        print(f"[Gemini PDF] Processing {total_chunks} chunk(s) for {filename}")

        # Send progress update if exam_id provided
        if exam_id:
            from services.progress_service import progress_service, ProgressUpdate, ProgressStatus
            await progress_service.update_progress(ProgressUpdate(
                exam_id=exam_id,
                status=ProgressStatus.SPLITTING,
                message=f"PDF已拆分为 {total_chunks} 个部分",
                progress=15.0,
                total_chunks=total_chunks
            ))

        all_questions = []
        # Process each chunk with fuzzy deduplication
        for chunk_idx, chunk_bytes in enumerate(pdf_chunks):
            current_chunk = chunk_idx + 1
            chunk_progress = 15.0 + (60.0 * current_chunk / total_chunks)

            print(f"[Gemini PDF] Processing chunk {current_chunk}/{total_chunks}")

            # Send progress update
            if exam_id:
                await progress_service.update_progress(ProgressUpdate(
                    exam_id=exam_id,
                    status=ProgressStatus.PROCESSING_CHUNK,
                    message=f"正在处理第 {current_chunk}/{total_chunks} 部分...",
                    progress=chunk_progress,
                    total_chunks=total_chunks,
                    current_chunk=current_chunk,
                    questions_extracted=len(all_questions)
                ))

            try:
                questions = await self._parse_pdf_chunk(chunk_bytes, f"{filename}_chunk_{current_chunk}")
                print(f"[Gemini PDF] Chunk {current_chunk} extracted {len(questions)} questions")

                # Fuzzy deduplicate across chunks
                from dedup_utils import is_duplicate_question

                for q in questions:
                    if not is_duplicate_question(q, all_questions, threshold=0.85):
                        all_questions.append(q)
                    else:
                        print(f"[PDF Split] Skipped fuzzy duplicate from chunk {current_chunk}")

            except Exception as e:
                print(f"[Gemini PDF] Chunk {current_chunk} failed: {str(e)}")
                # Continue with other chunks
                continue

        print(f"[Gemini PDF] Total questions extracted: {len(all_questions)} (after deduplication)")

        # Send final progress for PDF processing
        if exam_id:
            await progress_service.update_progress(ProgressUpdate(
                exam_id=exam_id,
                status=ProgressStatus.DEDUPLICATING,
                message=f"PDF处理完成，提取了 {len(all_questions)} 个题目",
                progress=75.0,
                total_chunks=total_chunks,
                current_chunk=total_chunks,
                questions_extracted=len(all_questions)
            ))

        return all_questions

    async def _parse_pdf_chunk(self, pdf_bytes: bytes, chunk_name: str) -> List[Dict[str, Any]]:
        """
        Parse a single PDF chunk.
        Internal method used by parse_document_with_pdf.
        """
        prompt = """你是一个专业的试题解析专家。请仔细分析这个 PDF 文档，提取其中的所有试题。

**识别规则**：
- PDF 中可能包含中文或英文题目、图片、表格、公式
- 题目可能有多种格式，请灵活识别
- **重要**：只提取完整的题目，忽略任何不完整的题目（题目被截断、缺少选项、缺少关键信息等）
- 如果题目看起来不完整（比如开头或结尾被切断），直接跳过该题目
- 题目内容如果包含代码或换行，请将换行符替换为\\n
- 图片中的文字也要识别并提取

**题目类型识别** (严格使用以下4种类型之一)：
1. **single** - 单选题：只有一个正确答案的选择题
2. **multiple** - 多选题：有多个正确答案的选择题（答案格式如：AB、ABC、ACD等）
3. **judge** - 判断题：对错/是非/True False题目
4. **short** - 简答题：包括问答、计算、证明、填空、编程等所有非选择题

**多选题识别关键词**：
- 明确标注"多选"、"多项选择"、"Multiple Choice"
- 题干中包含"可能"、"正确的有"、"包括"等
- 答案是多个字母组合（如：ABC、BD、ABCD）

**每道题目提取字段**：
1. **content**: 完整的题目文字（去除题号，换行用\\n表示）
2. **type**: 题目类型（single/multiple/judge/short）
3. **options**: 选项数组（仅选择题，格式: ["A. 选项1", "B. 选项2", ...]）
4. **answer**: 正确答案
   - 单选题: 单个字母 (如 "A"、"B")
   - 多选题: 多个字母无空格 (如 "AB"、"ABC"、"BD")
   - 判断题: "对"/"错"、"正确"/"错误"、"True"/"False"
   - 简答题: 完整答案文本，如果没有答案填 null
5. **analysis**: 解析说明（如果有）

**JSON 格式要求**：
1. **必须**返回一个完整的 JSON 数组（以 [ 开始，以 ] 结束）
2. **不要**返回 JSONL 格式（每行一个 JSON 对象）
3. **不要**包含 markdown 代码块标记（```json 或 ```）
4. **不要**包含任何解释性文字
5. 字符串中的特殊字符必须正确转义（换行用 \\n，引号用 \\"，反斜杠用 \\\\）
6. 不要在字符串值中使用未转义的控制字符

**返回格式示例**：
[
  {{
    "content": "下列关于Python的描述，正确的是",
    "type": "single",
    "options": ["A. Python是编译型语言", "B. Python支持面向对象编程", "C. Python不支持函数式编程", "D. Python只能用于Web开发"],
    "answer": "B",
    "analysis": "Python是解释型语言，支持多种编程范式"
  }},
  {{
    "content": "以下哪些是Python的优点（多选）",
    "type": "multiple",
    "options": ["A. 语法简洁", "B. 库丰富", "C. 执行速度最快", "D. 易于学习"],
    "answer": "ABD",
    "analysis": "Python优点是语法简洁、库丰富、易学，但执行速度不是最快的"
  }},
  {{
    "content": "Python是一种高级编程语言",
    "type": "judge",
    "options": [],
    "answer": "对",
    "analysis": null
  }}
]

**最后提醒**：
- 请仔细查看 PDF 的每一页
- 仔细识别多选题（看题干、看答案格式）
- 单选和多选容易混淆，请特别注意区分
- 如果找不到明确的选项，可以根据上下文推断题目类型
- 题目内容中的换行请用\\n或空格替换，确保 JSON 格式正确
- **只返回一个 JSON 数组**，不要包含其他任何内容"""

        try:
            print(f"[Gemini PDF] Processing chunk: {chunk_name}", flush=True)
            print(f"[Gemini PDF] Chunk size: {len(pdf_bytes)} bytes", flush=True)

            # Use Gemini's native PDF processing via REST API
            import base64

            # Encode PDF to base64
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            print(f"[Gemini PDF] PDF encoded to base64: {len(pdf_base64)} chars", flush=True)

            # Build REST API request
            url = f"{self.gemini_base_url}/v1beta/models/{self.model}:generateContent"
            headers = {"Content-Type": "application/json"}
            params = {"key": self.gemini_api_key}
            payload = {
                "contents": [{
                    "parts": [
                        {"inline_data": {"mime_type": "application/pdf", "data": pdf_base64}},
                        {"text": prompt}
                    ]
                }]
            }

            print(f"[Gemini PDF] Calling Gemini REST API with model: {self.model}", flush=True)
            response = await self.client.post(url, headers=headers, params=params, json=payload)
            response.raise_for_status()
            print(f"[Gemini PDF] API call completed", flush=True)

            response_data = response.json()

            # Extract text from response
            result = response_data["candidates"][0]["content"]["parts"][0]["text"]
            print(f"[Gemini PDF] Response retrieved, checking content...", flush=True)

            # Log original response for debugging
            import sys
            print(f"[LLM Raw Response] Length: {len(result)} chars", flush=True)
            print(f"[LLM Raw Response] First 300 chars:\n{result[:300]}", flush=True)
            print(f"[LLM Raw Response] Last 200 chars:\n{result[-200:]}", flush=True)
            sys.stdout.flush()

            # Clean result and parse JSON (same as text method)
            result = result.strip()

            # Remove markdown code blocks
            if result.startswith("```json"):
                result = result[7:]
            elif result.startswith("```"):
                result = result[3:]

            if result.endswith("```"):
                result = result[:-3]

            result = result.strip()

            # Try to find JSON array if there's extra text
            if not result.startswith('['):
                start_idx = result.find('[')
                if start_idx != -1:
                    print(f"[JSON Cleanup] Found '[' at position {start_idx}, extracting array...", flush=True)
                    result = result[start_idx:]
                else:
                    print(f"[JSON Error] No '[' found in response!", flush=True)
                    raise Exception("LLM response does not contain a JSON array")

            if not result.endswith(']'):
                end_idx = result.rfind(']')
                if end_idx != -1:
                    print(f"[JSON Cleanup] Found last ']' at position {end_idx}", flush=True)
                    result = result[:end_idx + 1]

            result = result.strip()

            # Additional cleanup: fix common JSON issues
            # 1. Remove trailing commas before closing brackets
            import re
            result = re.sub(r',(\s*[}\]])', r'\1', result)

            # Log the cleaned result for debugging
            print(f"[LLM Cleaned JSON] Length: {len(result)} chars", flush=True)
            print(f"[LLM Cleaned JSON] First 300 chars:\n{result[:300]}", flush=True)

            try:
                questions = json.loads(result)
            except json.JSONDecodeError as je:
                print(f"[JSON Error] Failed to parse JSON at line {je.lineno}, column {je.colno}", flush=True)
                print(f"[JSON Error] Error: {je.msg}", flush=True)
                # Print context around the error
                lines = result.split('\n')
                if je.lineno <= len(lines):
                    start = max(0, je.lineno - 3)
                    end = min(len(lines), je.lineno + 2)
                    print(f"[JSON Error] Context (lines {start+1}-{end}):", flush=True)
                    for i in range(start, end):
                        marker = " >>> " if i == je.lineno - 1 else "     "
                        print(f"{marker}{i+1}: {lines[i]}", flush=True)
                raise Exception(f"Invalid JSON format from LLM: {je.msg} at line {je.lineno}")

            # Validate that we got a list
            if not isinstance(questions, list):
                raise Exception(f"Expected a list of questions, got {type(questions)}")

            if len(questions) == 0:
                # Provide more helpful error message
                print(f"[Gemini PDF] ⚠️ Gemini returned empty array - PDF may not contain recognizable questions", flush=True)
                print(f"[Gemini PDF] 💡 Trying to get Gemini's explanation...", flush=True)

                # Ask Gemini what it saw in the PDF using REST API
                explanation_payload = {
                    "contents": [{
                        "parts": [
                            {"inline_data": {"mime_type": "application/pdf", "data": pdf_base64}},
                            {"text": "Please describe what you see in this PDF document. What is the main content? Are there any questions, exercises, or test items? Respond in Chinese."}
                        ]
                    }]
                }

                explanation_response = await self.client.post(url, headers=headers, params=params, json=explanation_payload)
                explanation_response.raise_for_status()
                explanation_data = explanation_response.json()
                explanation = explanation_data["candidates"][0]["content"]["parts"][0]["text"]
                print(f"[Gemini PDF] 📄 Gemini sees: {explanation[:500]}...", flush=True)

                raise Exception(f"No questions found in PDF. Gemini's description: {explanation[:200]}...")

            # Validate and fix question types
            valid_types = {"single", "multiple", "judge", "short"}
            type_mapping = {
                "proof": "short",
                "essay": "short",
                "calculation": "short",
                "fill": "short",
                "填空": "short",
                "证明": "short",
                "计算": "short",
                "问答": "short",
                "单选": "single",
                "多选": "multiple",
                "判断": "judge",
                "简答": "short"
            }

            # Add content hash and validate types
            for q in questions:
                if "content" not in q:
                    print(f"[Warning] Question missing 'content' field: {q}", flush=True)
                    continue

                # Validate and fix question type
                q_type = q.get("type", "short")
                if isinstance(q_type, str):
                    q_type_lower = q_type.lower()
                    if q_type_lower not in valid_types:
                        # Try to map to valid type
                        if q_type_lower in type_mapping:
                            old_type = q_type
                            q["type"] = type_mapping[q_type_lower]
                            print(f"[Type Fix] Changed '{old_type}' to '{q['type']}' for question: {q['content'][:50]}...", flush=True)
                        else:
                            # Default to short answer
                            print(f"[Type Fix] Unknown type '{q_type}', defaulting to 'short' for question: {q['content'][:50]}...", flush=True)
                            q["type"] = "short"
                    else:
                        q["type"] = q_type_lower
                else:
                    q["type"] = "short"

                q["content_hash"] = calculate_content_hash(q["content"])

            print(f"[Gemini PDF] Successfully extracted {len(questions)} questions", flush=True)
            return questions

        except Exception as e:
            print(f"[Error] PDF parsing failed: {str(e)}", flush=True)
            raise Exception(f"Failed to parse PDF document: {str(e)}")

    async def grade_short_answer(
        self,
        question: str,
        correct_answer: str,
        user_answer: str
    ) -> Dict[str, Any]:
        """
        Grade a short answer question using AI.

        Returns:
        {
            "score": 0.0-1.0,
            "feedback": "Detailed feedback"
        }
        """
        prompt = f"""Grade the following short answer question.

Question: {question}

Standard Answer: {correct_answer}

Student Answer: {user_answer}

Provide a score from 0.0 to 1.0 (where 1.0 is perfect) and detailed feedback.

Return ONLY a JSON object:
{{
  "score": 0.85,
  "feedback": "Your detailed feedback here"
}}

Be fair but strict. Consider:
1. Correctness of key points
2. Completeness of answer
3. Clarity of expression

Return ONLY the JSON object, no markdown or explanations."""

        try:
            if self.provider == "anthropic":
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                result = response.content[0].text
            elif self.provider == "gemini":
                # Gemini uses REST API
                url = f"{self.gemini_base_url}/v1beta/models/{self.model}:generateContent"
                headers = {"Content-Type": "application/json"}
                params = {"key": self.gemini_api_key}
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }

                response = await self.client.post(url, headers=headers, params=params, json=payload)
                response.raise_for_status()
                response_data = response.json()
                result = response_data["candidates"][0]["content"]["parts"][0]["text"]
            else:  # OpenAI or Qwen
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a fair and strict grader. Return only JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5,
                )
                result = response.choices[0].message.content

            # Clean and parse JSON
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()

            grading = json.loads(result)
            return {
                "score": float(grading.get("score", 0.0)),
                "feedback": grading.get("feedback", "")
            }

        except Exception as e:
            print(f"Error grading answer: {e}")
            # Return default grading on error
            return {
                "score": 0.0,
                "feedback": "Unable to grade answer due to an error."
            }


# Singleton instance
llm_service = LLMService()
