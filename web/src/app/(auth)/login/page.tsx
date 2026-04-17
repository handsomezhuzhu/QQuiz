"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || "登录失败");
      }

      toast.success("登录成功");
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0 bg-brand-grid bg-[size:34px_34px] opacity-40" />
      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_480px]">
        <Card className="hidden border-slate-900/10 bg-slate-950 text-white lg:block">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-slate-300">
              <ShieldCheck className="h-4 w-4" />
              QQuiz Web
            </div>
            <CardTitle className="text-4xl leading-tight">登录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-300">
            <p>使用管理员或测试账号进入系统。</p>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/92">
          <CardHeader>
            <CardTitle className="text-3xl">登录</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">用户名</label>
                <Input
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">密码</label>
                <Input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </div>

              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "登录中..." : "登录"}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-sm text-slate-600">
                还没有账号？
                <Link className="ml-2 font-medium text-primary underline-offset-4 hover:underline" href="/register">
                  立即注册
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
