"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function PageButton({
  href,
  children,
  disabled,
  active = false,
  className
}: {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  if (disabled) {
    return (
      <Button className={className} disabled size="sm" type="button" variant="outline">
        {children}
      </Button>
    );
  }

  return (
    <Button
      asChild
      className={className}
      size="sm"
      type="button"
      variant={active ? "default" : "outline"}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function PaginationControls({
  page,
  pageSize,
  total,
  className
}: {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  if (total <= pageSize) {
    return null;
  }

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, currentPage * pageSize);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams?.toString());
    if (targetPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div>
        显示第 {rangeStart}-{rangeEnd} 条，共 {total} 条
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PageButton disabled={currentPage <= 1} href={buildHref(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </PageButton>
        <PageButton disabled={currentPage <= 1} href={buildHref(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </PageButton>

        {visiblePages.map((visiblePage, index) => {
          const previousPage = visiblePages[index - 1];
          const showGap = previousPage && visiblePage - previousPage > 1;

          return (
            <div key={visiblePage} className="flex items-center gap-2">
              {showGap ? <span className="px-1 text-slate-400">...</span> : null}
              <PageButton
                active={visiblePage === currentPage}
                href={buildHref(visiblePage)}
              >
                {visiblePage}
              </PageButton>
            </div>
          );
        })}

        <PageButton disabled={currentPage >= totalPages} href={buildHref(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </PageButton>
        <PageButton disabled={currentPage >= totalPages} href={buildHref(totalPages)}>
          <ChevronsRight className="h-4 w-4" />
        </PageButton>
      </div>
    </div>
  );
}
