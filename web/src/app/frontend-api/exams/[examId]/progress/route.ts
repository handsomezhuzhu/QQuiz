import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  buildBackendUrl
} from "@/lib/api/config";

export async function GET(
  _request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const target = `${buildBackendUrl(`/exams/${params.examId}/progress`)}?token=${encodeURIComponent(token)}`;
  let response: Response;
  try {
    response = await fetch(target, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache"
      },
      cache: "no-store"
    });
  } catch {
    return new NextResponse("Backend API is unavailable.", {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }

  if (!response.ok || !response.body) {
    const payload = await response.text();
    return new NextResponse(payload || "Failed to open exam progress stream", {
      status: response.status
    });
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
