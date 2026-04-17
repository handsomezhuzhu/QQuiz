"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (!response.ok) {
      toast.error("退出失败");
      return;
    }

    toast.success("已退出登录");
    router.push("/login");
    router.refresh();
  }

  return (
    <Button onClick={handleLogout} variant="outline">
      <LogOut className="h-4 w-4" />
      退出登录
    </Button>
  );
}
