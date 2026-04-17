import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { LogoutButton } from "@/components/app-shell/logout-button";
import { requireCurrentUser } from "@/lib/auth/guards";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const currentUser = await requireCurrentUser();

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar isAdmin={currentUser.is_admin} />
      <div className="min-h-screen flex-1">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">QQuiz</p>
            <p className="text-sm text-slate-600">
              {currentUser.username} · {currentUser.is_admin ? "管理员" : "普通用户"}
            </p>
          </div>
          <LogoutButton />
        </div>
        <main className="container py-8">{children}</main>
      </div>
    </div>
  );
}
