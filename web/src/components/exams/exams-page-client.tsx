"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app-shell/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { browserApi } from "@/lib/api/browser";
import { formatDate, formatRelativeTime } from "@/lib/formatters";
import { ExamSummary } from "@/lib/types";

export function ExamsPageClient({
  initialExams,
  initialTotal,
  page,
  pageSize
}: {
  initialExams: ExamSummary[];
  initialTotal: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exams, setExams] = useState(initialExams);
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    setExams(initialExams);
    setTotal(initialTotal);
  }, [initialExams, initialTotal]);

  function goToPage(targetPage: number) {
    const params = new URLSearchParams(window.location.search);
    if (targetPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }

    const query = params.toString();
    router.push(query ? `/exams?${query}` : "/exams");
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("请选择文件");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    formData.append("is_random", "false");

    setCreating(true);
    try {
      const response = await browserApi<{ exam_id: number }>("/exams/create", {
        method: "POST",
        body: formData
      });

      toast.success("题库已创建");
      setTitle("");
      setFile(null);
      router.push(`/exams/${response.exam_id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(examId: number) {
    if (!window.confirm("确认删除这个题库？")) {
      return;
    }

    setDeletingId(examId);
    try {
      await browserApi<void>(`/exams/${examId}`, {
        method: "DELETE"
      });

      setExams((current) => current.filter((exam) => exam.id !== examId));
      setTotal((current) => Math.max(0, current - 1));
      toast.success("题库已删除");
      if (exams.length === 1 && page > 1) {
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
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader>
          <CardTitle>新建题库</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="题库名称"
              required
            />
            <Input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
            <Button className="w-full" disabled={creating} type="submit">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "创建中" : "创建"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>题库列表</CardTitle>
            <div className="text-sm text-slate-500">{total} 条</div>
          </div>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              暂无题库
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">名称</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">题目</th>
                    <th className="px-4 py-3 font-medium">更新时间</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <Link className="font-medium text-slate-900 hover:underline" href={`/exams/${exam.id}`}>
                          {exam.title}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{formatDate(exam.created_at)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={exam.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {exam.current_index}/{exam.total_questions}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatRelativeTime(exam.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/exams/${exam.id}`}>查看</Link>
                          </Button>
                          <Button
                            aria-label={`删除 ${exam.title}`}
                            disabled={deletingId === exam.id}
                            onClick={() => handleDelete(exam.id)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            {deletingId === exam.id ? (
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
    </div>
  );
}
