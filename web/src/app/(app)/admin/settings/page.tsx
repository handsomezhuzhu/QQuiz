import { SettingsPanel } from "@/components/admin/settings-panel";
import { PageHeader } from "@/components/app-shell/page-header";
import { requireAdminUser } from "@/lib/auth/guards";
import { serverApi } from "@/lib/api/server";
import { SystemConfigResponse } from "@/lib/types";

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const config = await serverApi<SystemConfigResponse>("/admin/config");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Settings" title="系统设置" />
      <SettingsPanel initialConfig={config} />
    </div>
  );
}
