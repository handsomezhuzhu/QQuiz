"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { browserApi } from "@/lib/api/browser";
import { AnswerCheckResponse, MistakeListResponse } from "@/lib/types";
import { getQuestionTypeLabel } from "@/lib/formatters";

type MistakeItem = MistakeListResponse["mistakes"][number];

export function MistakePracticeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerCheckResponse | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>([]);

  useEffect(() => {
    void loadMistakes();
  }, []);

  async function loadMistakes() {
    setLoading(true);
    try {
      const payload = await browserApi<MistakeListResponse>("/mistakes/?skip=0&limit=1000", {
        method: "GET"
      });

      let nextMistakes = payload.mistakes;
      if (searchParams.get("mode") === "random") {
        nextMistakes = [...payload.mistakes].sort(() => Math.random() - 0.5);
      }

      nextMistakes = nextMistakes.map((item) => {
        if (item.question.type === "judge" && (!item.question.options || item.question.options.length === 0)) {
          item.question.options = ["A. 正确", "B. 错误"];
        }
        return item;
      });

      setMistakes(nextMistakes);
      setCurrentIndex(0);
      setResult(null);
      setUserAnswer("");
      setMultipleAnswers([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  const currentMistake = mistakes[currentIndex] || null;
  const question = currentMistake?.question || null;
  const progressText = useMemo(
    () => (mistakes.length ? `${currentIndex + 1} / ${mistakes.length}` : "0 / 0"),
    [currentIndex, mistakes.length]
  );

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!currentMistake) {
      return;
    }

    try {
      await browserApi<void>(`/mistakes/${currentMistake.id}`, {
        method: "DELETE"
      });
      const nextList = mistakes.filter((item) => item.id !== currentMistake.id);
      setMistakes(nextList);
      setCurrentIndex((current) => Math.max(0, Math.min(current, nextList.length - 1)));
      setResult(null);
      setUserAnswer("");
      setMultipleAnswers([]);
      toast.success("已移除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除失败");
    }
  }

  function handleNext() {
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex((current) => current + 1);
      setResult(null);
      setUserAnswer("");
      setMultipleAnswers([]);
      return;
    }

    toast.success("已完成");
    router.push("/mistakes");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        错题本为空
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => router.push("/mistakes")} type="button" variant="outline">
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
          <Button onClick={handleRemove} size="sm" type="button" variant="outline">
            <Trash2 className="h-4 w-4" />
            移除
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
                {currentIndex < mistakes.length - 1 ? "下一题" : "完成"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
