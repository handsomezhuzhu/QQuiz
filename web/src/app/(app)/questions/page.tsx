import { PageHeader } from "@/components/app-shell/page-header";
import { QuestionList } from "@/components/questions/question-list";
import { serverApi } from "@/lib/api/server";
import {
  DEFAULT_PAGE_SIZE,
  getOffset,
  parseOptionalPositiveInt,
  parsePositiveInt
} from "@/lib/pagination";
import { QuestionListResponse } from "@/lib/types";

export default async function QuestionsPage({
  searchParams
}: {
  searchParams?: {
    page?: string | string[];
    examId?: string | string[];
  };
}) {
  const page = parsePositiveInt(searchParams?.page);
  const examId = parseOptionalPositiveInt(searchParams?.examId);
  const examFilter = examId ? `&exam_id=${examId}` : "";
  const data = await serverApi<QuestionListResponse>(
    `/questions/?skip=${getOffset(page, DEFAULT_PAGE_SIZE)}&limit=${DEFAULT_PAGE_SIZE}${examFilter}`
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Questions"
        title="题目"
        description={examId ? `当前仅显示题库 #${examId} 的题目。` : undefined}
      />
      <QuestionList
        examId={examId}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        questions={data.questions}
        total={data.total}
      />
    </div>
  );
}
