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

    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "openai")

        if self.provider == "openai":
            self.client = AsyncOpenAI(
                api_key=os.getenv("OPENAI_API_KEY"),
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
            )
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        elif self.provider == "anthropic":
            self.client = AsyncAnthropic(
                api_key=os.getenv("ANTHROPIC_API_KEY")
            )
            self.model = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")

        elif self.provider == "qwen":
            self.client = AsyncOpenAI(
                api_key=os.getenv("QWEN_API_KEY"),
                base_url=os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
            )
            self.model = os.getenv("QWEN_MODEL", "qwen-plus")

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
        prompt = """You are a professional question parser. Parse the given document and extract all questions.

For each question, identify:
1. Question content (the question text)
2. Question type: single (单选), multiple (多选), judge (判断), short (简答)
3. Options (for choice questions only, format: ["A. Option1", "B. Option2", ...])
4. Correct answer
5. Analysis/Explanation (if available)

Return ONLY a JSON array of questions, with no additional text:
[
  {
    "content": "question text",
    "type": "single",
    "options": ["A. Option1", "B. Option2", "C. Option3", "D. Option4"],
    "answer": "A",
    "analysis": "explanation"
  },
  ...
]

Document content:
---
{content}
---

IMPORTANT: Return ONLY the JSON array, no markdown code blocks or explanations."""

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

            # Clean result and parse JSON
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()

            questions = json.loads(result)

            # Add content hash to each question
            for q in questions:
                q["content_hash"] = calculate_content_hash(q["content"])

            return questions

        except Exception as e:
            print(f"Error parsing document: {e}")
            raise Exception(f"Failed to parse document: {str(e)}")

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
