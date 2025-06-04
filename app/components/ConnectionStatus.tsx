"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";

interface ConnectionState {
  isConnected: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
  retryCount: number;
}

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  className?: string;
}

export const ConnectionStatus = ({
  connectionState,
  className = "",
}: ConnectionStatusProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Показываем статус только если есть проблемы с соединением
  useEffect(() => {
    if (
      !connectionState.isOnline ||
      (!connectionState.isConnected && connectionState.isOnline)
    ) {
      setIsVisible(true);
    } else {
      // Скрываем через небольшую задержку, если все в порядке
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionState.isOnline, connectionState.isConnected]);

  if (!isVisible) return null;

  const getStatusText = () => {
    if (!connectionState.isOnline) {
      return "Нет подключения к интернету";
    }
    if (!connectionState.isConnected) {
      return `Переподключение${
        connectionState.retryCount > 0
          ? ` (попытка ${connectionState.retryCount})`
          : ""
      }...`;
    }
    return "Подключено";
  };

  const getStatusIcon = () => {
    if (!connectionState.isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }
    if (!connectionState.isConnected) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (!connectionState.isOnline) {
      return "bg-red-500 text-white";
    }
    if (!connectionState.isConnected) {
      return "bg-yellow-500 text-white";
    }
    return "bg-green-500 text-white";
  };

  return (
    <div
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        px-3 py-2 rounded-lg shadow-lg
        flex items-center gap-2
        text-sm font-medium
        transition-all duration-300
        ${getStatusColor()}
        ${className}
      `}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>

      {connectionState.lastSyncTime && connectionState.isOnline && (
        <span className="text-xs opacity-75 ml-2">
          Синхр: {connectionState.lastSyncTime.toLocaleTimeString()}
        </span>
      )}

      {connectionState.retryCount >= 3 && (
        <AlertCircle className="w-4 h-4 text-red-200" />
      )}
    </div>
  );
};
