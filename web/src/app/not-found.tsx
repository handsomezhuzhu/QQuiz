import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg border-slate-200/70 bg-white/90">
        <CardHeader>
          <CardTitle>页面不存在</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            这个路由还没有迁入新的 Next.js 前端，或者你访问了一个不存在的地址。
          </p>
          <Button asChild>
            <Link href="/dashboard">返回仪表盘</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
