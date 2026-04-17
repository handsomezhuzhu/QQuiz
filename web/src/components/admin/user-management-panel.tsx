"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Shield, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { browserApi } from "@/lib/api/browser";
import { formatDate } from "@/lib/formatters";
import { AdminUserSummary } from "@/lib/types";

type EditingState = {
  id: number | null;
  username: string;
  password: string;
  isAdmin: boolean;
};

export function UserManagementPanel({
  initialPage,
  initialSearch,
  initialUsers,
  initialTotal,
  pageSize
}: {
  initialPage: number;
  initialSearch: string;
  initialUsers: AdminUserSummary[];
  initialTotal: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditingState>({
    id: null,
    username: "",
    password: "",
    isAdmin: false
  });

  const isCreateMode = editing.id === null;
  const title = isCreateMode ? "创建用户" : "编辑用户";

  const activeAdminCount = useMemo(
    () => users.filter((user) => user.is_admin).length,
    [users]
  );

  useEffect(() => {
    setSearch(initialSearch);
    setUsers(initialUsers);
    setTotal(initialTotal);
  }, [initialSearch, initialUsers, initialTotal]);

  function buildAdminUrl(nextSearch: string, nextPage: number) {
    const params = new URLSearchParams(window.location.search);
    const normalizedSearch = nextSearch.trim();

    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    if (normalizedSearch) {
      params.set("search", normalizedSearch);
    } else {
      params.delete("search");
    }

    const query = params.toString();
    return query ? `/admin?${query}` : "/admin";
  }

  function startCreate() {
    setEditing({
      id: null,
      username: "",
      password: "",
      isAdmin: false
    });
  }

  function startEdit(user: AdminUserSummary) {
    setEditing({
      id: user.id,
      username: user.username,
      password: "",
      isAdmin: user.is_admin
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (isCreateMode) {
        await browserApi("/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: editing.username,
            password: editing.password,
            is_admin: editing.isAdmin
          })
        });
        toast.success("用户已创建");
      } else {
        const updatePayload: Record<string, unknown> = {
          username: editing.username,
          is_admin: editing.isAdmin
        };

        if (editing.password) {
          updatePayload.password = editing.password;
        }

        await browserApi(`/admin/users/${editing.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatePayload)
        });
        toast.success("用户已更新");
      }

      startCreate();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: AdminUserSummary) {
    if (!window.confirm(`确认删除用户 ${user.username}？`)) {
      return;
    }

    setDeletingId(user.id);
    try {
      await browserApi(`/admin/users/${user.id}`, {
        method: "DELETE"
      });
      toast.success("用户已删除");
      if (editing.id === user.id) {
        startCreate();
      }
      if (users.length === 1 && initialPage > 1) {
        router.push(buildAdminUrl(search, initialPage - 1));
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleResetPassword(user: AdminUserSummary) {
    const nextPassword = window.prompt(`给 ${user.username} 设置新密码`, "");
    if (!nextPassword) {
      return;
    }

    try {
      await browserApi(`/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          new_password: nextPassword
        })
      });
      toast.success("密码已重置");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    }
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildAdminUrl(search, 1));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              placeholder="用户名"
              value={editing.username}
              onChange={(event) =>
                setEditing((current) => ({ ...current, username: event.target.value }))
              }
              required
            />
            <Input
              type="password"
              placeholder={isCreateMode ? "密码" : "留空则不修改密码"}
              value={editing.password}
              onChange={(event) =>
                setEditing((current) => ({ ...current, password: event.target.value }))
              }
              required={isCreateMode}
              minLength={6}
            />
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                checked={editing.isAdmin}
                className="h-4 w-4 rounded border-slate-300"
                onChange={(event) =>
                  setEditing((current) => ({ ...current, isAdmin: event.target.checked }))
                }
                type="checkbox"
              />
              管理员
            </label>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={submitting} type="submit">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCreateMode ? (
                  <UserPlus className="h-4 w-4" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {isCreateMode ? "创建" : "保存"}
              </Button>
              {!isCreateMode ? (
                <Button onClick={startCreate} type="button" variant="outline">
                  取消
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>用户</CardTitle>
            <div className="text-sm text-slate-500">
              {total} 个用户 / {activeAdminCount} 个管理员
            </div>
          </div>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSearch}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="搜索用户名"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
              查询
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">题库</th>
                  <th className="px-4 py-3 font-medium">错题</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.is_admin ? "管理员" : "普通用户"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.exam_count}</td>
                    <td className="px-4 py-3 text-slate-600">{user.mistake_count}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => startEdit(user)} size="sm" type="button" variant="outline">
                          编辑
                        </Button>
                        <Button
                          onClick={() => handleResetPassword(user)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          重置密码
                        </Button>
                        <Button
                          aria-label={`删除 ${user.username}`}
                          disabled={deletingId === user.id}
                          onClick={() => handleDelete(user)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                      暂无用户
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <PaginationControls
            className="mt-4 rounded-2xl border border-slate-200"
            page={initialPage}
            pageSize={pageSize}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
