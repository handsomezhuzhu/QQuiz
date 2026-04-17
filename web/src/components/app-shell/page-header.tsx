import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-4">
      {eyebrow ? <Badge variant="outline">{eyebrow}</Badge> : null}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
