import type { Task } from "./types";

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTasksAsJson(tasks: Task[]) {
  const jsonStr = JSON.stringify(tasks, null, 2);
  triggerDownload(jsonStr, "spatialgrid-tasks.json", "application/json");
}

export function exportTasksAsCsv(tasks: Task[]) {
  const headers = [
    "id",
    "tier",
    "kind",
    "question",
    "options",
    "answer_index",
    "answer_text",
    "objects_count",
    "lighting",
    "seed",
    "image_path",
    "explanation",
  ];

  const escapeCsv = (val: string | number | undefined) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = tasks.map((t) => [
    escapeCsv(t.id),
    escapeCsv(t.tier),
    escapeCsv(t.kind),
    escapeCsv(t.question),
    escapeCsv(t.options.join(" | ")),
    escapeCsv(t.answer),
    escapeCsv(t.options[t.answer]),
    escapeCsv(t.difficulty.objects),
    escapeCsv(t.difficulty.lighting),
    escapeCsv(t.seed),
    escapeCsv(t.image),
    escapeCsv(t.explanation),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerDownload(csvContent, "spatialgrid_benchmark.csv", "text/csv;charset=utf-8;");
}

export function exportHuggingFaceJsonl(tasks: Task[]) {
  const lines = tasks.map((t) =>
    JSON.stringify({
      id: t.id,
      tier: t.tier,
      task_type: t.kind,
      question: t.question,
      choices: t.options,
      answer_index: t.answer,
      answer: t.options[t.answer],
      difficulty: {
        num_objects: t.difficulty.objects,
        lighting: t.difficulty.lighting,
      },
      seed: t.seed,
      image_file: t.image.replace("/bench/images/", ""),
      ground_truth_explanation: t.explanation,
    })
  );
  triggerDownload(lines.join("\n"), "spatialgrid_hf_metadata.jsonl", "application/x-ndjson");
}
