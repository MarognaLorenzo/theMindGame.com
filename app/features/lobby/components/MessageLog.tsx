interface MessageLogProps {
  messages: string[];
  onClear: () => void;
}

export function MessageLog({ messages, onClear }: MessageLogProps) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cyan-300">Live Message Log</h2>
        <button
          onClick={onClear}
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          Clear
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
        {messages.length === 0 ? (
          <p className="text-slate-500">No messages yet.</p>
        ) : (
          <ul className="space-y-1">
            {messages.map((line, index) => (
              <li key={`${line}-${index}`} className="break-all">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
