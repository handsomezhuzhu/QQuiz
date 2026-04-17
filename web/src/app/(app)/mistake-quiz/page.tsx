import { PageHeader } from "@/components/app-shell/page-header";
import { MistakePracticeClient } from "@/components/practice/mistake-practice-client";

export default function MistakeQuizPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Mistake Practice" title="错题练习" />
      <MistakePracticeClient />
    </div>
  );
}
