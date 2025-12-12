"""
Question Deduplication Utilities
Provides fuzzy matching algorithms to handle AI-generated variations
"""
import difflib
import re
from typing import List, Dict, Any


def normalize_text(text: str) -> str:
    """
    Normalize text for comparison by removing extra whitespace and punctuation variations.

    Args:
        text: Input text to normalize

    Returns:
        Normalized text
    """
    if not text:
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove common punctuation variations (Chinese/English)
    text = text.replace('，', ',').replace('。', '.').replace('！', '!').replace('？', '?')
    text = text.replace('：', ':').replace('；', ';').replace('"', '"').replace('"', '"')
    # Strip leading/trailing whitespace
    return text.strip()


def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two texts using multiple methods.

    Uses a combination of:
    1. SequenceMatcher for character-level similarity (70% weight)
    2. Jaccard similarity for word-level matching (30% weight)

    Args:
        text1: First text
        text2: Second text

    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not text1 or not text2:
        return 0.0

    # Normalize texts
    norm_text1 = normalize_text(text1)
    norm_text2 = normalize_text(text2)

    # Exact match after normalization
    if norm_text1 == norm_text2:
        return 1.0

    # 1. Character-level similarity using SequenceMatcher (handles typos, minor variations)
    char_similarity = difflib.SequenceMatcher(None, norm_text1, norm_text2).ratio()

    # 2. Word-level Jaccard similarity (handles word reordering, additions/deletions)
    words1 = set(norm_text1.split())
    words2 = set(norm_text2.split())

    if not words1 or not words2:
        return char_similarity

    intersection = words1.intersection(words2)
    union = words1.union(words2)
    jaccard_similarity = len(intersection) / len(union) if union else 0.0

    # Weighted average (character similarity matters more for exact question matching)
    final_similarity = 0.7 * char_similarity + 0.3 * jaccard_similarity

    return final_similarity


def is_duplicate_question(
    new_question: Dict[str, Any],
    existing_questions: List[Dict[str, Any]],
    threshold: float = 0.85
) -> bool:
    """
    Check if a question is duplicate using fuzzy matching.

    Handles AI-generated variations where the same question might have:
    - Minor wording differences
    - Extra/missing punctuation
    - Different whitespace
    - Slight paraphrasing

    Args:
        new_question: Question to check (dict with 'content' key)
        existing_questions: List of questions already processed
        threshold: Similarity threshold (0.85 = 85% similar is considered duplicate)

    Returns:
        True if duplicate found, False otherwise
    """
    new_content = new_question.get('content', '')
    if not new_content:
        return False

    for existing_q in existing_questions:
        existing_content = existing_q.get('content', '')
        if not existing_content:
            continue

        similarity = calculate_similarity(new_content, existing_content)

        if similarity >= threshold:
            print(f"[Fuzzy Dedup] Found duplicate (similarity: {similarity:.2%})", flush=True)
            print(f"  New: {new_content[:60]}...", flush=True)
            print(f"  Existing: {existing_content[:60]}...", flush=True)
            return True

    return False


def deduplicate_questions(
    questions: List[Dict[str, Any]],
    threshold: float = 0.85
) -> List[Dict[str, Any]]:
    """
    Remove duplicate questions from a list using fuzzy matching.

    Args:
        questions: List of questions to deduplicate
        threshold: Similarity threshold for fuzzy matching

    Returns:
        List of unique questions
    """
    unique_questions = []

    for q in questions:
        if not is_duplicate_question(q, unique_questions, threshold):
            unique_questions.append(q)

    print(f"[Dedup] Reduced from {len(questions)} to {len(unique_questions)} questions")
    return unique_questions
