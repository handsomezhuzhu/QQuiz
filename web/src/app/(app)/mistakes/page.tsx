import { MistakeListClient } from "@/components/mistakes/mistake-list-client";
import { PageHeader } from "@/components/app-shell/page-header";
import { serverApi } from "@/lib/api/server";
import { DEFAULT_PAGE_SIZE, getOffset, parsePositiveInt } from "@/lib/pagination";
import { MistakeListResponse } from "@/lib/types";

export default async function MistakesPage({
  searchParams
}: {
  searchParams?: { page?: string | string[] };
}) {
  const page = parsePositiveInt(searchParams?.page);
  const data = await serverApi<MistakeListResponse>(
    `/mistakes/?skip=${getOffset(page, DEFAULT_PAGE_SIZE)}&limit=${DEFAULT_PAGE_SIZE}`
  );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Mistakes" title="错题" />
      <MistakeListClient
        initialMistakes={data.mistakes}
        initialTotal={data.total}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
      />
    </div>
  );
}
