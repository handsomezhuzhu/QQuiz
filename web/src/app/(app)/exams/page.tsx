import { PageHeader } from "@/components/app-shell/page-header";
import { ExamsPageClient } from "@/components/exams/exams-page-client";
import { serverApi } from "@/lib/api/server";
import { DEFAULT_PAGE_SIZE, getOffset, parsePositiveInt } from "@/lib/pagination";
import { ExamListResponse } from "@/lib/types";

export default async function ExamsPage({
  searchParams
}: {
  searchParams?: { page?: string | string[] };
}) {
  const page = parsePositiveInt(searchParams?.page);
  const data = await serverApi<ExamListResponse>(
    `/exams/?skip=${getOffset(page, DEFAULT_PAGE_SIZE)}&limit=${DEFAULT_PAGE_SIZE}`
  );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Exams" title="题库" />
      <ExamsPageClient
        initialExams={data.exams}
        initialTotal={data.total}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
      />
    </div>
  );
}
