"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, LayoutDashboard, Settings, Shield, SquareStack, Target, XCircle } from "lucide-react";

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
    <aside className="hidden h-screen w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white/80 px-5 py-6 backdrop-blur xl:flex">
      <div className="space-y-4">
        <Badge variant="outline" className="w-fit border-slate-300 text-slate-600">
          QQuiz Web
        </Badge>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">QQuiz</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">题库与刷题</p>
        </div>
      </div>

      <Separator className="my-6" />

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
