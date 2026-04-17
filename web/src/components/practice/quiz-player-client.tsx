"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookmarkPlus, BookmarkX, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { browserApi } from "@/lib/api/browser";
import { AnswerCheckResponse, ExamSummary, QuestionDetail } from "@/lib/types";
import { getQuestionTypeLabel } from "@/lib/formatters";

export function QuizPlayerClient({
  examId
}: {
  examId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [result, setResult] = useState<AnswerCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inMistakeBook, setInMistakeBook] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>([]);

  useEffect(() => {
    void loadQuiz();
  }, [examId]);

  async function loadQuiz() {
    setLoading(true);
    try {
      if (searchParams.get("reset") === "true") {
        await browserApi(`/exams/${examId}/progress`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ current_index: 0 })
        });
      }

      const [examPayload, questionPayload, mistakesPayload] = await Promise.all([
        browserApi<ExamSummary>(`/exams/${examId}`, { method: "GET" }),
        browserApi<QuestionDetail>(`/questions/exam/${examId}/current`, { method: "GET" }),
        browserApi<{ mistakes: Array<{ question_id: number }> }>("/mistakes", {
          method: "GET",
          query: {
            skip: 0,
            limit: 1000
          }
        })
      ]);

      if (questionPayload.type === "judge" && (!questionPayload.options || questionPayload.options.length === 0)) {
        questionPayload.options = ["A. 正确", "B. 错误"];
      }

      setExam(examPayload);
      setQuestion(questionPayload);
      setResult(null);
      setUserAnswer("");
      setMultipleAnswers([]);
      setInMistakeBook(mistakesPayload.mistakes.some((item) => item.question_id === questionPayload.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  const progressText = useMemo(() => {
    if (!exam) {
      return "";
    }

    return `${exam.current_index + 1} / ${exam.total_questions}`;
  }, [exam]);

  async function handleSubmit() {
    if (!question) {
      return;
    }

    let answer = userAnswer;
    if (question.type === "multiple") {
      if (multipleAnswers.length === 0) {
        toast.error("请至少选择一个选项");
        return;
      }
      answer = [...multipleAnswers].sort().join("");
    }

    if (!answer.trim()) {
      toast.error("请输入答案");
      return;
    }

    setSubmitting(true);
    try {
      const payload = await browserApi<AnswerCheckResponse>("/questions/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question_id: question.id,
          user_answer: answer
        })
      });
      setResult(payload);
      setInMistakeBook(!payload.correct || inMistakeBook);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (!exam) {
      return;
    }

    try {
      await browserApi(`/exams/${examId}/progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ current_index: exam.current_index + 1 })
      });

      await loadQuiz();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "跳转失败");
    }
  }

  async function handleToggleMistake() {
    if (!question) {
      return;
    }

    try {
      if (inMistakeBook) {
        await browserApi(`/mistakes/question/${question.id}`, {
          method: "DELETE"
        });
        setInMistakeBook(false);
      } else {
        await browserApi("/mistakes/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ question_id: question.id })
        });
        setInMistakeBook(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam || !question) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        当前没有可练习的题目
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => router.push(`/exams/${examId}`)} type="button" variant="outline">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="text-sm text-slate-600">{progressText}</div>
      </div>

      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="space-y-2">
            <CardTitle>{question.content}</CardTitle>
            <div className="text-sm text-slate-500">{getQuestionTypeLabel(question.type)}</div>
          </div>
          <Button onClick={handleToggleMistake} size="sm" type="button" variant="outline">
            {inMistakeBook ? <BookmarkX className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
            {inMistakeBook ? "移除错题" : "加入错题"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.options?.length ? (
            <div className="space-y-3">
              {question.options.map((option) => {
                const letter = option.charAt(0);
                const selected =
                  question.type === "multiple"
                    ? multipleAnswers.includes(letter)
                    : userAnswer === letter;

                return (
                  <button
                    key={option}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-primary bg-blue-50 text-slate-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    disabled={Boolean(result)}
                    onClick={() => {
                      if (result) {
                        return;
                      }

                      if (question.type === "multiple") {
                        setMultipleAnswers((current) =>
                          current.includes(letter)
                            ? current.filter((item) => item !== letter)
                            : [...current, letter]
                        );
                      } else {
                        setUserAnswer(letter);
                      }
                    }}
                    type="button"
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : null}

          {question.type === "short" ? (
            <textarea
              className="min-h-36 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 focus:border-primary"
              onChange={(event) => setUserAnswer(event.target.value)}
              placeholder="输入答案"
              value={userAnswer}
            />
          ) : null}

          {!result ? (
            <Button className="w-full" disabled={submitting} onClick={handleSubmit} type="button">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              提交
            </Button>
          ) : (
            <div className={`rounded-2xl border p-4 ${result.correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 font-medium">
                {result.correct ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-600" />}
                {result.correct ? "回答正确" : "回答错误"}
              </div>
              {!result.correct ? (
                <div className="mt-3 text-sm text-slate-700">
                  正确答案：{result.correct_answer}
                </div>
              ) : null}
              {result.analysis ? (
                <div className="mt-3 text-sm text-slate-600">{result.analysis}</div>
              ) : null}
              {result.ai_feedback ? (
                <div className="mt-3 text-sm text-slate-600">{result.ai_feedback}</div>
              ) : null}
              <Button className="mt-4 w-full" onClick={handleNext} type="button">
                下一题
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
