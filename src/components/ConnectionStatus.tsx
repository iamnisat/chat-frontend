import { useSocketContext } from "../context/SocketContext";

export function ConnectionStatus() {
  const { isConnected, isReconnecting } = useSocketContext();

  const getStatusColor = () => {
    if (isConnected) return "bg-emerald-400";
    if (isReconnecting) return "bg-amber-400";
    return "bg-rose-400";
  };

  const getStatusText = () => {
    if (isConnected) return "Online";
    if (isReconnecting) return "Connecting...";
    return "Offline";
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        {isConnected && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
        )}
      </div>
      <span className="text-xs font-medium text-gray-400">{getStatusText()}</span>
    </div>
  );
}
