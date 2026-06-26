import { useSocketContext } from "../context/SocketContext";

export function ConnectionStatus() {
  const { isConnected, isReconnecting, socketId } = useSocketContext();

  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (isReconnecting) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (isConnected) return "Connected";
    if (isReconnecting) return "Reconnecting...";
    return "Disconnected";
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
      {socketId && <span className="text-gray-400">({socketId.slice(0, 8)}...)</span>}
    </div>
  );
}
