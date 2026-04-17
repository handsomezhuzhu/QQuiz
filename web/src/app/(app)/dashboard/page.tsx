import Link from "next/link";
import { BookOpen, FolderOpen, Shield, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import { StatusBadge } from "@/components/app-shell/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/formatters";
import { requireCurrentUser } from "@/lib/auth/guards";
import { serverApi } from "@/lib/api/server";
import {
  AdminStatisticsResponse,
  ExamListResponse,
  ExamSummaryStats,
  MistakeListResponse
} from "@/lib/types";

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();
  const [exams, summary, mistakes, stats] = await Promise.all([
    serverApi<ExamListResponse>("/exams/?skip=0&limit=5"),
    serverApi<ExamSummaryStats>("/exams/summary"),
    serverApi<MistakeListResponse>("/mistakes/?skip=0&limit=1"),
    currentUser.is_admin
      ? serverApi<AdminStatisticsResponse>("/admin/statistics")
      : Promise.resolve(null)
  ]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Dashboard" title={`你好，${currentUser.username}`} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="题库"
          value={String(summary.total_exams)}
          detail={`${summary.ready_exams} 就绪 / ${summary.processing_exams} 处理中`}
        />
        <StatCard
          icon={BookOpen}
          label="题目"
          value={String(summary.total_questions)}
          detail={`已完成 ${summary.completed_questions}`}
        />
        <StatCard
          icon={TriangleAlert}
          label="错题"
          value={String(mistakes.total)}
          detail={mistakes.total > 0 ? "待复习" : "暂无错题"}
        />
        <StatCard
          icon={Shield}
          label="角色"
          value={currentUser.is_admin ? "管理员" : "用户"}
          detail={currentUser.is_admin && stats ? `全站 ${stats.users.total} 用户` : undefined}
        />
      </div>

      <Card className="border-slate-200/70 bg-white/90">
        <CardHeader>
          <CardTitle>最近题库</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.exams.length === 0 ? (
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
                    <th className="px-4 py-3 font-medium">进度</th>
                    <th className="px-4 py-3 font-medium">更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.exams.map((exam) => (
                    <tr key={exam.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <Link className="font-medium text-slate-900 hover:underline" href={`/exams/${exam.id}`}>
                          {exam.title}
                        </Link>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
