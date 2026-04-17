"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { browserApi } from "@/lib/api/browser";
import { SystemConfigResponse } from "@/lib/types";

export function SettingsPanel({
  initialConfig
}: {
  initialConfig: SystemConfigResponse;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = await browserApi<SystemConfigResponse>("/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });
      setConfig(payload);
      toast.success("设置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-6 xl:grid-cols-2" onSubmit={handleSubmit}>
      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader>
          <CardTitle>基础设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
            <span>允许注册</span>
            <input
              checked={config.allow_registration}
              className="h-4 w-4"
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  allow_registration: event.target.checked
                }))
              }
              type="checkbox"
            />
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">单文件大小限制（MB）</label>
            <Input
              type="number"
              value={config.max_upload_size_mb}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  max_upload_size_mb: Number(event.target.value || 0)
                }))
              }
              min={1}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">每日上传次数</label>
            <Input
              type="number"
              value={config.max_daily_uploads}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  max_daily_uploads: Number(event.target.value || 0)
                }))
              }
              min={1}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">AI 提供商</label>
            <select
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm"
              value={config.ai_provider}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  ai_provider: event.target.value
                }))
              }
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="qwen">Qwen</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white/92">
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">OpenAI Base URL</label>
            <Input
              value={config.openai_base_url || ""}
              onChange={(event) =>
                setConfig((current) => ({ ...current, openai_base_url: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">OpenAI API Key</label>
            <Input
              type="password"
              value={config.openai_api_key || ""}
              onChange={(event) =>
                setConfig((current) => ({ ...current, openai_api_key: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Gemini 模型</label>
            <Input
              value={config.gemini_model || ""}
              onChange={(event) =>
                setConfig((current) => ({ ...current, gemini_model: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">OpenAI 模型</label>
            <Input
              value={config.openai_model || ""}
              onChange={(event) =>
                setConfig((current) => ({ ...current, openai_model: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Anthropic 模型</label>
            <Input
              value={config.anthropic_model || ""}
              onChange={(event) =>
                setConfig((current) => ({ ...current, anthropic_model: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Qwen 模型</label>
            <Input
              value={config.qwen_model || ""}
              onChange={(event) =>
                setConfig((current) => ({ ...current, qwen_model: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="xl:col-span-2">
        <Button disabled={saving} type="submit">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </Button>
      </div>
    </form>
  );
}
