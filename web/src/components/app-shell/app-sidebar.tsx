"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  SquareStack,
  Target,
  XCircle
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const baseNavigation = [
  { href: "/dashboard", label: "总览", icon: LayoutDashboard },
  { href: "/exams", label: "题库", icon: SquareStack },
  { href: "/questions", label: "题目", icon: BookMarked },
  { href: "/mistakes", label: "错题", icon: XCircle },
  { href: "/mistake-quiz", label: "错题练习", icon: Target }
];

const adminNavigation = [
  { href: "/admin", label: "管理", icon: Shield },
  { href: "/admin/settings", label: "系统设置", icon: Settings }
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const navigation = isAdmin
    ? [...baseNavigation, ...adminNavigation]
    : baseNavigation;
  const activeHref =
    navigation
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        (item) =>
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
      )?.href || "";

  return (
    <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 flex-col border-r border-slate-200/80 bg-white/75 px-4 py-5 shadow-[12px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl xl:flex">
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-panel">
        <Badge className="w-fit border-white/10 bg-white/10 text-white hover:bg-white/10">
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          QQuiz Web
        </Badge>
        <div className="mt-6">
          <h2 className="text-2xl font-semibold tracking-tight">QQuiz</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">智能题库、刷题和错题复盘工作台</p>
        </div>
      </div>

      <Separator className="my-5 bg-slate-200/80" />

      <nav className="space-y-1.5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition-colors",
                  active ? "bg-white/15" : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
