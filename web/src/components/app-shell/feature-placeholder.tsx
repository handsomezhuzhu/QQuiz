import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
  bullets,
  ctaHref = "/dashboard",
  ctaLabel = "返回首页"
}: {
  eyebrow: string;
  title: string;
  description?: string;
  bullets: string[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-slate-200/70 bg-white/90">
          <CardHeader>
            <CardTitle>待接入</CardTitle>
            <CardDescription>下一步会接真实数据和操作。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <p className="text-sm leading-6 text-slate-700">{bullet}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-900/10 bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full bg-white text-slate-950">
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
