import { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="border-white/70 bg-white/90">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-950 p-3 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl">{value}</CardTitle>
          </div>
        </div>
      </CardHeader>
      {detail ? <CardContent className="text-sm text-slate-600">{detail}</CardContent> : null}
    </Card>
  );
}
