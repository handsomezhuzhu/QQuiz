"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Play, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app-shell/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { browserApi } from "@/lib/api/browser";
import { formatDate } from "@/lib/formatters";
import { ExamSummary, ExamUploadResponse, ProgressEvent } from "@/lib/types";

export function ExamDetailClient({
  initialExam
}: {
  initialExam: ExamSummary;
}) {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [exam, setExam] = useState(initialExam);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);

  const isProcessing = exam.status === "processing";

  useEffect(() => {
    if (!isProcessing) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const source = new EventSource(`/api/exams/${exam.id}/progress`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ProgressEvent;
      setProgress(payload);

      if (payload.status === "completed") {
        toast.success(payload.message);
        source.close();
        eventSourceRef.current = null;
        reloadExam();
      }

      if (payload.status === "failed") {
        toast.error(payload.message);
        source.close();
        eventSourceRef.current = null;
        reloadExam();
      }
    };

    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [isProcessing, exam.id]);

  async function reloadExam() {
    try {
      const payload = await browserApi<ExamSummary>(`/exams/${exam.id}`, {
        method: "GET"
      });
      setExam(payload);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      toast.error("请选择文件");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);
    try {
      const payload = await browserApi<ExamUploadResponse>(`/exams/${exam.id}/append`, {
        method: "POST",
        body: formData
      });
      setExam((current) => ({ ...current, status: payload.status as ExamSummary["status"] }));
      setProgress(null);
      setSelectedFile(null);
      toast.success("文档已提交");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  const progressValue = useMemo(() => {
    if (isProcessing) {
      return Math.round(Number(progress?.progress || 0));
    }

    if (exam.total_questions <= 0) {
      return 0;
    }

    return Math.round((exam.current_index / exam.total_questions) * 100);
  }, [exam.current_index, exam.total_questions, isProcessing, progress]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
            <StatusBadge status={exam.status} />
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/questions?examId=${exam.id}`}>题目</Link>
            </Button>
            {exam.total_questions > 0 ? (
              <Button asChild>
                <Link href={`/quiz/${exam.id}`}>开始</Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">题目</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {exam.total_questions}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">已完成</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {exam.current_index}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">剩余</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {Math.max(0, exam.total_questions - exam.current_index)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">进度</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {progressValue}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            {progress ? (
              <div className="text-sm text-slate-600">{progress.message}</div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
            <div>创建时间：{formatDate(exam.created_at)}</div>
            <div>更新时间：{formatDate(exam.updated_at)}</div>
          </div>

          {exam.status === "failed" ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              解析失败，请重新上传文档。
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader>
          <CardTitle>追加文档</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleUpload}>
            <Input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.xlsx,.xls"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              required
            />
            <Button className="w-full" disabled={uploading || isProcessing} type="submit">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isProcessing ? "处理中" : "上传"}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              支持 TXT / PDF / DOC / DOCX / XLSX / XLS
            </div>
            <div>处理过程中会自动去重。</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
