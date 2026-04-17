import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getQuestionTypeLabel, formatDate } from "@/lib/formatters";
import { QuestionListItem } from "@/lib/types";

export function QuestionList({
  examId,
  page,
  pageSize,
  questions,
  total
}: {
  examId?: number;
  page: number;
  pageSize: number;
  questions: QuestionListItem[];
  total: number;
}) {
  return (
    <Card className="border-slate-200/70 bg-white/92">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>题目</CardTitle>
          {examId ? <div className="text-sm text-slate-500">题库 #{examId}</div> : null}
        </div>
        <div className="text-sm text-slate-500">{total} 条</div>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            暂无题目
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">题目</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">题库</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">
                      <div className="line-clamp-2 max-w-3xl">{question.content}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {getQuestionTypeLabel(question.type)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">#{question.exam_id}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(question.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationControls
          className="mt-4 rounded-2xl border border-slate-200"
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </CardContent>
    </Card>
  );
}
