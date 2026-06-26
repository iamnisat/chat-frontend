import type { ThreadModule } from "../types";

interface ThreadListProps {
  threads: ThreadModule[];
  selectedThread: number | null;
  onSelectThread: (threadId: number) => void;
}

export function ThreadList({ threads, selectedThread, onSelectThread }: ThreadListProps) {
  return (
    <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Threads</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-100 transition-colors ${
              selectedThread === thread.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
            }`}
          >
            <div className="font-medium text-gray-800">{thread.name}</div>
            <div className="text-sm text-gray-500">Thread #{thread.id}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
