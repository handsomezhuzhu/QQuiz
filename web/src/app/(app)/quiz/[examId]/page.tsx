import { PageHeader } from "@/components/app-shell/page-header";
import { QuizPlayerClient } from "@/components/practice/quiz-player-client";

export default function QuizPage({
  params
}: {
  params: { examId: string };
}) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`Quiz #${params.examId}`} title="刷题" />
      <QuizPlayerClient examId={params.examId} />
    </div>
  );
}
