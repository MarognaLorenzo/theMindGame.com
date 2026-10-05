// Shared HTML shell for the moderation pages (served by the Worker itself,
// not the Next.js app).
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPage(body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Leaderboard review</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0e141b; color: #eff3f8; display: flex; justify-content: center; margin: 0; padding: 1.5rem; }
  .card { max-width: 40rem; width: 100%; }
  button { padding: 0.5rem 1rem; border-radius: 0.75rem; border: none; background: #7ce4c0; color: #0a1712; font-weight: 600; font-size: 0.875rem; cursor: pointer; }
  .deny { background: #f08f8f; }
  .queue { list-style: none; padding: 0; margin: 0 0 2rem; }
  .queue li { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 0; border-bottom: 1px solid #ffffff1a; }
  .queue .meta { color: #9aa7b5; font-size: 0.875rem; }
  .queue .actions { display: flex; gap: 0.5rem; }
  .nav { display: flex; gap: 1.25rem; margin-bottom: 1.5rem; }
  .nav a { color: #7ce4c0; }
  .nav a.current { color: #eff3f8; font-weight: 600; text-decoration: none; }
</style>
</head><body>${body}</body></html>`;
}
