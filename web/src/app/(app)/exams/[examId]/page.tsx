import { ExamDetailClient } from "@/components/exams/exam-detail-client";
import { PageHeader } from "@/components/app-shell/page-header";
import { serverApi } from "@/lib/api/server";
import { ExamSummary } from "@/lib/types";

export default async function ExamDetailPage({
  params
}: {
  params: { examId: string };
}) {
  const exam = await serverApi<ExamSummary>(`/exams/${params.examId}`);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`Exam #${params.examId}`} title="题库详情" />
      <ExamDetailClient initialExam={exam} />
    </div>
  );
}
