"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  MoreHorizontal,
  Users,
  Mail,
  Eye,
  Edit,
  Shield,
  Clock,
} from "lucide-react";

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
  { value: "owner", label: "Мои списки" },
  { value: "editor", label: "Редактор" },
  { value: "viewer", label: "Просмотр" },
];

export default function SharePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("shared");
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

    // Все списки показываем как "Владелец" пока нет реальной системы ролей
    const matchesFilter = (() => {
      switch (activeFilter) {
        case "owner":
          return true; // Все списки показываем как принадлежащие пользователю
        case "editor":
          return false; // Пока нет системы ролей
        case "viewer":
          return false; // Пока нет системы ролей
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Владелец":
        return <Shield className="w-4 h-4 text-green-600" />;
      case "Редактор":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "Просмотр":
        return <Eye className="w-4 h-4 text-gray-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

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
            <h1 className="text-lg font-normal text-gray-900">Общий доступ</h1>
            <p className="text-sm text-gray-600 mt-1">
              Управление совместными списками и приглашениями
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

            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors">
              <Mail className="w-4 h-4" />
              <span>Пригласить</span>
            </button>

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
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1">
          <button
            onClick={() => setActiveTab("shared")}
            className={`px-3 py-2 text-sm font-normal transition-colors rounded-lg ${
              activeTab === "shared"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Общие списки ({lists.length})
          </button>
          <button
            onClick={() => setActiveTab("invites")}
            className={`px-3 py-2 text-sm font-normal transition-colors rounded-lg ${
              activeTab === "invites"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Приглашения (0)
          </button>
        </div>

        {/* Search and Filters */}
        {activeTab === "shared" && (
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
        )}
      </div>

      {/* Stats */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {lists.length}
            </div>
            <div className="text-xs text-gray-500">Общих списков</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {lists.length}
            </div>
            <div className="text-xs text-gray-500">Мои списки</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">0</div>
            <div className="text-xs text-gray-500">Ожидающих</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-normal text-gray-900">
              {lists.filter((l) => l.completedCount < l.itemsCount).length}
            </div>
            <div className="text-xs text-gray-500">Активных</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="border-b border-gray-200">
        {activeTab === "shared" ? (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs font-normal text-gray-500 uppercase tracking-wide">
                <div className="flex items-center gap-4">
                  <span className="w-8">Роль</span>
                  <span>Название</span>
                  <span className="w-24">Владелец</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="w-20">Создан</span>
                  <span>Прогресс</span>
                  <span className="w-6"></span>
                </div>
              </div>
            </div>

            {/* Error State */}
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
              /* Shared Lists */
              filteredLists.map((list) => (
                <Link key={list.id} href={`/list/${list.id}`}>
                  <div className="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center">
                          {getRoleIcon("Владелец")}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-sm font-normal text-gray-900">
                            {list.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Последний доступ{" "}
                            {formatLastUpdated(list.updated_at)}
                          </p>
                        </div>

                        <div className="w-24">
                          <p className="text-xs text-gray-600">Вы</p>
                          <p className="text-xs text-gray-500">Владелец</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-20 text-xs text-gray-500">
                          {formatDate(list.created_at)}
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-normal text-gray-900">
                            {list.completedCount} / {list.itemsCount}
                          </p>
                          <p className="text-xs text-gray-500">
                            {list.itemsCount > 0
                              ? Math.round(
                                  (list.completedCount / list.itemsCount) * 100
                                )
                              : 0}
                            %
                          </p>
                        </div>

                        <button
                          className="p-1 hover:bg-gray-200 transition-colors rounded-md"
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500 text-sm">
                  Общих списков не найдено
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {lists.length === 0
                    ? "Создайте первый список"
                    : "Попробуйте изменить параметры поиска"}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Invites Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs font-normal text-gray-500 uppercase tracking-wide">
                <div className="flex items-center gap-4">
                  <span className="w-8">Статус</span>
                  <span>Email</span>
                  <span className="w-32">Список</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="w-16">Роль</span>
                  <span className="w-20">Отправлено</span>
                  <span className="w-6"></span>
                </div>
              </div>
            </div>

            {/* No Invites */}
            <div className="px-6 py-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Нет ожидающих приглашений</p>
              <p className="text-gray-400 text-xs mt-1">
                Используйте кнопку "Пригласить" для отправки приглашений
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
