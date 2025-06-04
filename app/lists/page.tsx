"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ListCard } from "../components/ListCard";
import { NewListButton } from "../components/NewListButton";
import { Search, Filter, MoreHorizontal, Calendar, Users } from "lucide-react";

interface ShoppingListSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  itemsCount: number;
  completedCount: number;
}

const filterOptions = [
  { value: "all", label: "Все списки" },
  { value: "active", label: "Активные" },
  { value: "completed", label: "Завершенные" },
  { value: "shared", label: "Общие" },
];

export default function ListsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [lists, setLists] = useState<ShoppingListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Загружаем списки из API
  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/lists");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки списков");
      }

      setLists(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
      console.error("Ошибка загрузки списков:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Функция для удаления всех списков
  const handleDeleteAllLists = async () => {
    if (
      !confirm(
        "Вы уверены, что хотите удалить ВСЕ списки? Это действие нельзя отменить."
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch("/api/lists", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка удаления списков");
      }

      setLists([]);
      alert("Все списки успешно удалены");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Ошибка удаления";
      setError(errorMessage);
      alert(`Ошибка: ${errorMessage}`);
      console.error("Ошибка удаления всех списков:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Форматируем дату
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU");
  };

  // Форматируем время обновления
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Только что";
    if (diffInHours < 24) return `${diffInHours} ч. назад`;
    if (diffInHours < 48) return "1 день назад";

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} дн. назад`;
  };

  const filteredLists = lists.filter((list) => {
    const matchesSearch = list.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesFilter = (() => {
      switch (activeFilter) {
        case "active":
          return list.completedCount < list.itemsCount;
        case "completed":
          return list.completedCount === list.itemsCount;
        case "shared":
          return false; // Пока нет логики для общих списков
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка списков...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-normal text-gray-900">
              Управление списками
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredLists.length} из {lists.length} списков
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lists.length > 0 && (
              <button
                onClick={handleDeleteAllLists}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors duration-200 rounded-md border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Удаление..." : "Удалить все"}
              </button>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
                showFilters
                  ? "bg-gray-100 border-gray-300"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Фильтры</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 hover:border-gray-300 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
              <span>Еще</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 text-sm font-normal focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {showFilters && (
            <div className="flex items-center gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-3 py-1 text-xs font-normal border transition-colors ${
                    activeFilter === option.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {lists.length}
            </div>
            <div className="text-xs text-gray-500">Всего списков</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {lists.filter((l) => false).length}
            </div>
            <div className="text-xs text-gray-500">Общих списков</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {
                lists.filter(
                  (l) => l.completedCount === l.itemsCount && l.itemsCount > 0
                ).length
              }
            </div>
            <div className="text-xs text-gray-500">Завершенных</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {lists.reduce((sum, l) => sum + l.itemsCount, 0)}
            </div>
            <div className="text-xs text-gray-500">Всего товаров</div>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-xs font-normal text-gray-500 uppercase tracking-wide">
            <div className="flex items-center gap-4">
              <span className="w-8"></span>
              <span>Название</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="w-16">Создан</span>
              <span>Статус</span>
              <span className="w-20">Прогресс</span>
              <span className="w-6"></span>
            </div>
          </div>
        </div>

        {/* Lists */}
        {error ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-red-600 mb-2">Ошибка: {error}</p>
            <button
              onClick={() => fetchLists()}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Попробовать снова
            </button>
          </div>
        ) : filteredLists.length > 0 ? (
          <>
            {filteredLists.map((list) => (
              <Link key={list.id} href={`/list/${list.id}`}>
                <div className="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-gray-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-normal text-gray-900">
                            {list.name}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Обновлён {formatLastUpdated(list.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="w-16 text-xs text-gray-500">
                        {formatDate(list.created_at)}
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-normal text-gray-900">
                          {list.completedCount} / {list.itemsCount}
                        </p>
                        <p className="text-xs text-gray-500">
                          товаров выполнено
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <div className="w-full bg-gray-200 h-1">
                            <div
                              className="bg-gray-700 h-1 transition-all duration-300"
                              style={{
                                width: `${
                                  list.itemsCount > 0
                                    ? Math.round(
                                        (list.completedCount /
                                          list.itemsCount) *
                                          100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {list.itemsCount > 0
                              ? Math.round(
                                  (list.completedCount / list.itemsCount) * 100
                                )
                              : 0}
                            %
                          </p>
                        </div>

                        <button className="p-1 hover:bg-gray-200 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            <NewListButton onListCreated={fetchLists} />
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 text-sm">Списки не найдены</p>
            <p className="text-gray-400 text-xs mt-1">
              {lists.length === 0
                ? "Создайте первый список"
                : "Попробуйте изменить параметры поиска"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
