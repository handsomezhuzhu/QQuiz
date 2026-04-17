import { PageHeader } from "@/components/app-shell/page-header";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { requireAdminUser } from "@/lib/auth/guards";
import { serverApi } from "@/lib/api/server";
import { DEFAULT_PAGE_SIZE, getOffset, parsePositiveInt } from "@/lib/pagination";
import { UserListResponse } from "@/lib/types";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: {
    page?: string | string[];
    search?: string | string[];
  };
}) {
  await requireAdminUser();
  const page = parsePositiveInt(searchParams?.page);
  const search = Array.isArray(searchParams?.search)
    ? searchParams?.search[0]
    : searchParams?.search;
  const query = new URLSearchParams({
    skip: String(getOffset(page, DEFAULT_PAGE_SIZE)),
    limit: String(DEFAULT_PAGE_SIZE)
  });

  if (search?.trim()) {
    query.set("search", search.trim());
  }

  const data = await serverApi<UserListResponse>(`/admin/users?${query.toString()}`);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="用户管理" />
      <UserManagementPanel
        initialPage={page}
        initialSearch={search?.trim() || ""}
        initialTotal={data.total}
        initialUsers={data.users}
        pageSize={DEFAULT_PAGE_SIZE}
      />
    </div>
  );
}
