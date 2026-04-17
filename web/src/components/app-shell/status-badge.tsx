import { Badge } from "@/components/ui/badge";
import { getExamStatusLabel } from "@/lib/formatters";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ready"
      ? "success"
      : status === "failed"
        ? "destructive"
        : status === "processing"
          ? "warning"
          : "outline";

  return <Badge variant={variant}>{getExamStatusLabel(status)}</Badge>;
}
