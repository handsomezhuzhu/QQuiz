"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { browserApi } from "@/lib/api/browser";
import { formatDate, getQuestionTypeLabel } from "@/lib/formatters";
import { MistakeListResponse } from "@/lib/types";

type MistakeItem = MistakeListResponse["mistakes"][number];

export function MistakeListClient({
  initialMistakes,
  initialTotal,
  page,
  pageSize
}: {
  initialMistakes: MistakeItem[];
  initialTotal: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [total, setTotal] = useState(initialTotal);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setMistakes(initialMistakes);
    setTotal(initialTotal);
  }, [initialMistakes, initialTotal]);

  function goToPage(targetPage: number) {
    const params = new URLSearchParams(window.location.search);
    if (targetPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }

    const query = params.toString();
    router.push(query ? `/mistakes?${query}` : "/mistakes");
  }

  async function handleDelete(mistake: MistakeItem) {
    setDeletingId(mistake.id);
    try {
      await browserApi<void>(`/mistakes/${mistake.id}`, {
        method: "DELETE"
      });
      setMistakes((current) => current.filter((item) => item.id !== mistake.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success("已移除");
      if (mistakes.length === 1 && page > 1) {
        goToPage(page - 1);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="border-slate-200/70 bg-white/92">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>错题</CardTitle>
        <div className="text-sm text-slate-500">{total} 条</div>
      </CardHeader>
      <CardContent>
        {mistakes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            暂无错题
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">题目</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">答案</th>
                  <th className="px-4 py-3 font-medium">加入时间</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {mistakes.map((mistake) => (
                  <tr key={mistake.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">
                      <div className="line-clamp-2 max-w-3xl">{mistake.question.content}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {getQuestionTypeLabel(mistake.question.type)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="line-clamp-1 max-w-xs">{mistake.question.answer}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(mistake.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          aria-label={`删除错题 ${mistake.id}`}
                          disabled={deletingId === mistake.id}
                          onClick={() => handleDelete(mistake)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          {deletingId === mistake.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationControls
          className="mt-4 rounded-2xl border border-slate-200"
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </CardContent>
    </Card>
  );
}
