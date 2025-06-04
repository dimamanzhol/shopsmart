"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewListButtonProps {
  onListCreated?: () => void | Promise<void>;
}

export const NewListButton = ({ onListCreated }: NewListButtonProps = {}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateNewList = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Новый список покупок",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка создания списка");
      }

      // Вызываем callback для обновления списка
      if (onListCreated) {
        await onListCreated();
      }

      // Перенаправляем на созданный список
      router.push(`/list/${data.id}`);
    } catch (error) {
      console.error("Ошибка создания списка:", error);
      alert(error instanceof Error ? error.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateNewList}
      disabled={isLoading}
      className="w-full bg-white border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors text-left rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded-md">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Plus className="w-4 h-4 text-gray-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-normal text-gray-700">
            {isLoading ? "Создание списка..." : "Создать новый список"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLoading ? "Пожалуйста, подождите" : "Новый список покупок"}
          </p>
        </div>
      </div>
    </button>
  );
};
