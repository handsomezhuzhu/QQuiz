"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getResponseErrorMessage,
  isRecord,
  readResponsePayload
} from "@/lib/api/response";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/frontend-api/proxy/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(getResponseErrorMessage(payload, "注册失败"));
      }

      if (!isRecord(payload)) {
        throw new Error("注册接口返回了无效响应");
      }

      toast.success("注册成功，请登录");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg border-white/80 bg-white/92">
        <CardHeader>
          <CardTitle className="text-3xl">创建账户</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">用户名</label>
              <Input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="3-50 位字母、数字、_ 或 -"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">密码</label>
              <Input
                autoComplete="new-password"
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                required
              />
            </div>

            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "提交中..." : "注册"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-sm text-slate-600">
              已有账号？
              <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/login">
                返回登录
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
