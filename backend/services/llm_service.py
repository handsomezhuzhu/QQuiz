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
            base_url = (config or {}).get("openai_base_url") or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
            self.model = (config or {}).get("openai_model") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

            if not api_key:
                raise ValueError("OpenAI API key not configured")

            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url=base_url,
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

请注意：
- 文档中可能包含中文或英文题目
- 题目可能有多种格式，请灵活识别
- 即使格式不标准，也请尽量提取题目内容
- 如果文档只是普通文章而没有题目，请返回空数组 []

对于每道题目，请识别：
1. 题目内容 (完整的题目文字)
2. 题目类型（**只能**使用以下4种类型之一）：
   - single：单选题
   - multiple：多选题
   - judge：判断题
   - short：简答题（包括问答题、计算题、证明题、填空题等所有非选择题）
3. 选项 (仅针对选择题，格式: ["A. 选项1", "B. 选项2", ...])
4. 正确答案 (请仔细查找文档中的答案。如果确实没有答案，可以填 null)
5. 解析/说明 (如果有的话)

**重要**：题目类型必须是 single、multiple、judge、short 之一，不要使用其他类型名称！

返回格式：请**只返回** JSON 数组，不要有任何其他文字或 markdown 代码块：
[
  {{
    "content": "题目内容",
    "type": "single",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "A",
    "analysis": "解析说明"
  }},
  ...
]

文档内容：
---
{content}
---

重要提示：
- 仔细阅读文档内容
- 识别所有看起来像试题的内容
- 如果文档中没有题目（比如只是普通文章），返回 []
- **只返回 JSON 数组**，不要包含 ```json 或其他标记"""

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

    async def parse_document_with_pdf(self, pdf_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """
        Parse PDF document using Gemini's native PDF understanding.
        Only works with Gemini provider.

        Args:
            pdf_bytes: PDF file content as bytes
            filename: Original filename for logging

        Returns:
            List of question dictionaries
        """
        if self.provider != "gemini":
            raise ValueError("PDF parsing is only supported with Gemini provider")

        prompt = """你是一个专业的试题解析专家。请仔细分析这个 PDF 文档，提取其中的所有试题。

请注意：
- PDF 中可能包含中文或英文题目
- 题目可能有多种格式，请灵活识别
- 即使格式不标准，也请尽量提取题目内容
- 题目内容如果包含代码或换行，请将换行符替换为空格或\\n

对于每道题目，请识别：
1. 题目内容 (完整的题目文字，如果有代码请保持在一行或用\\n表示换行)
2. 题目类型（**只能**使用以下4种类型之一）：
   - single：单选题
   - multiple：多选题
   - judge：判断题
   - short：简答题（包括问答题、计算题、证明题、填空题等所有非选择题）
3. 选项 (仅针对选择题，格式: ["A. 选项1", "B. 选项2", ...])
4. 正确答案 (请仔细查找文档中的答案。如果确实没有答案，可以填 null)
5. 解析/说明 (如果有的话)

**重要**：题目类型必须是 single、multiple、judge、short 之一，不要使用其他类型名称！

返回格式要求：
1. **必须**返回一个完整的 JSON 数组（以 [ 开始，以 ] 结束）
2. **不要**返回 JSONL 格式（每行一个 JSON 对象）
3. **不要**包含 markdown 代码块标记（```json 或 ```）
4. **不要**包含任何解释性文字

正确的格式示例：
[
  {{
    "content": "题目内容",
    "type": "single",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "A",
    "analysis": "解析说明"
  }},
  {{
    "content": "第二道题",
    "type": "judge",
    "options": [],
    "answer": "对",
    "analysis": null
  }}
]

重要提示：
- 请仔细查看 PDF 的每一页
- 识别所有看起来像试题的内容
- 如果找不到明确的选项，可以根据上下文推断题目类型
- 题目内容中的换行请用\\n或空格替换，确保 JSON 格式正确
- **只返回一个 JSON 数组**，不要包含其他任何内容"""

        try:
            print(f"[Gemini PDF] Processing PDF: {filename}", flush=True)
            print(f"[Gemini PDF] File size: {len(pdf_bytes)} bytes", flush=True)

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
