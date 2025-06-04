"use client";

import { useState } from "react";
import { X, Copy, Users, Eye, EyeOff, Check, ExternalLink } from "lucide-react";
import { ShoppingList } from "../lib/types";

interface ShareModalProps {
  list: ShoppingList;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (settings: {
    isPublic?: boolean;
    allowAnonymousEdit?: boolean;
  }) => Promise<void>;
}

export function ShareModal({
  list,
  isOpen,
  onClose,
  onUpdateSettings,
}: ShareModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = list.shareToken
    ? `${window.location.origin}/share/${list.shareToken}`
    : "";

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      await onUpdateSettings({ isPublic: !list.isPublic });
    } catch (error) {
      // Ошибка будет обработана в родительском компоненте
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleEditPermission = async () => {
    setIsUpdating(true);
    try {
      await onUpdateSettings({ allowAnonymousEdit: !list.allowAnonymousEdit });
    } catch (error) {
      // Ошибка будет обработана в родительском компоненте
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">
              Совместный доступ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Публичный доступ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  {list.isPublic ? (
                    <Eye className="w-3 h-3 text-green-600" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Публичный список
                  </div>
                  <div className="text-xs text-gray-600">
                    {list.isPublic
                      ? "Любой может открыть список по ссылке"
                      : "Только вы можете видеть этот список"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleTogglePublic}
                disabled={isUpdating}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  list.isPublic ? "bg-green-500" : "bg-gray-300"
                } ${isUpdating ? "opacity-50" : ""}`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    list.isPublic ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Ссылка для совместного доступа */}
            {list.isPublic && shareUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 text-sm text-gray-700 font-mono break-all">
                    {shareUrl}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCopyLink}
                      className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors"
                      title="Копировать ссылку"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={handleOpenInNewTab}
                      className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors"
                      title="Открыть в новой вкладке"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                {copied && (
                  <div className="text-xs text-green-600">
                    Ссылка скопирована в буфер обмена
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Разрешения на редактирование */}
          {list.isPublic && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Разрешить редактирование
                    </div>
                    <div className="text-xs text-gray-600">
                      {list.allowAnonymousEdit
                        ? "Любой может добавлять и изменять товары"
                        : "Только просмотр для других пользователей"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleToggleEditPermission}
                  disabled={isUpdating}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    list.allowAnonymousEdit ? "bg-blue-500" : "bg-gray-300"
                  } ${isUpdating ? "opacity-50" : ""}`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      list.allowAnonymousEdit
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Информация */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Совет:</strong> Поделитесь ссылкой с семьей или друзьями,
              чтобы составлять список покупок вместе в реальном времени.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors rounded-lg"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
