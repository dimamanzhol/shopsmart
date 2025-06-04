"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  MoreVertical,
  ShoppingCart,
  Users,
  Edit2,
  X,
} from "lucide-react";
import Layout from "./components/Layout";
import { supabase } from "./lib/supabase";

interface ShoppingList {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  itemsCount: number;
  completedCount: number;
  created_by: string | null;
}

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [showMenuForList, setShowMenuForList] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchLists = useCallback(async () => {
    if (!isLoaded || !user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/lists?userId=${user.id}`);
      const data = await response.json();

      if (response.ok) {
        setLists(data);
      }
    } catch (err) {
      console.error("Ошибка загрузки списков:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Realtime подписка для обновления списков
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    // Локальная функция для загрузки списков (избегаем бесконечного цикла)
    const loadLists = async () => {
      try {
        const response = await fetch(`/api/lists?userId=${user.id}`);
        const data = await response.json();
        if (response.ok) {
          setLists(data);
        }
      } catch (err) {
        console.error("Ошибка загрузки списков:", err);
      } finally {
        setLoading(false);
      }
    };

    // Очищаем предыдущую подписку
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    loadLists();

    // Создаём новый канал для списков пользователя
    const channel = supabase
      .channel(`user_shopping_lists_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shopping_lists",
        },
        () => {
          // Перезагружаем списки при добавлении нового
          loadLists();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shopping_lists",
        },
        () => {
          // Перезагружаем списки при обновлении
          loadLists();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "shopping_lists",
        },
        () => {
          // Перезагружаем списки при удалении
          loadLists();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
        },
        () => {
          // Перезагружаем списки при изменении товаров (для обновления счетчиков)
          loadLists();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Очистка при размонтировании
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, isLoaded]);

  // Закрытие меню при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenuForList) {
        setShowMenuForList(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenuForList]);

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Сегодня";
    } else if (diffDays === 1) {
      return "Вчера";
    } else if (diffDays <= 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString("ru-RU");
    }
  };

  // Удаление списка
  const handleDeleteList = async (listId: string, listName: string) => {
    if (
      !confirm(
        `Вы уверены, что хотите удалить список "${listName}"? Это действие нельзя отменить.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLists(lists.filter((list) => list.id !== listId));
        setShowMenuForList(null);
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка удаления списка");
      }
    } catch (error) {
      alert("Ошибка удаления списка");
    }
  };

  // Редактирование названия списка
  const handleStartEditList = (list: ShoppingList) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
    setShowMenuForList(null);
  };

  // Сохранение названия списка
  const handleSaveListName = async () => {
    if (!editingListId || !editingListName.trim()) return;

    try {
      const response = await fetch(`/api/lists/${editingListId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editingListName.trim() }),
      });

      if (response.ok) {
        const updatedList = await response.json();
        setLists(
          lists.map((list) =>
            list.id === editingListId
              ? {
                  ...list,
                  name: updatedList.name,
                  updated_at: updatedList.updated_at,
                }
              : list
          )
        );
        setEditingListId(null);
        setEditingListName("");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка обновления названия");
      }
    } catch (error) {
      alert("Ошибка обновления названия");
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingListId(null);
    setEditingListName("");
  };

  // Обработка клавиш
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveListName();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  if (!isLoaded) {
    return (
      <Layout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-normal text-gray-900">
                Списки покупок
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {lists.length > 0
                  ? `${lists.length} ${
                      lists.length === 1
                        ? "список"
                        : lists.length <= 4
                        ? "списка"
                        : "списков"
                    }`
                  : "Нет созданных списков"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/create"
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Создать список</span>
              </Link>
            </div>
          </div>

          {/* Search */}
          {lists.length > 0 && (
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по спискам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Загрузка списков...</p>
            </div>
          ) : filteredLists.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLists.map((list) => {
                const progress =
                  list.itemsCount > 0
                    ? Math.round((list.completedCount / list.itemsCount) * 100)
                    : 0;

                return (
                  <div
                    key={list.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group relative"
                  >
                    <div className="flex items-start justify-between mb-3">
                      {editingListId === list.id ? (
                        <input
                          type="text"
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onBlur={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveListName();
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            handleKeyPress(e);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="text-sm font-normal text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500 transition-colors flex-1 mr-2"
                          autoFocus
                        />
                      ) : (
                        <Link href={`/list/${list.id}`} className="flex-1">
                          <h3 className="text-sm font-normal text-gray-900 group-hover:text-black transition-colors">
                            {list.name}
                          </h3>
                        </Link>
                      )}

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowMenuForList(
                              showMenuForList === list.id ? null : list.id
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>

                        {showMenuForList === list.id && (
                          <div className="absolute right-0 top-6 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStartEditList(list);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Редактировать название
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteList(list.id, list.name);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Удалить список
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link href={`/list/${list.id}`} className="block">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {list.completedCount} из {list.itemsCount} товаров
                          </span>
                          <span>{progress}%</span>
                        </div>

                        <div className="w-full bg-gray-200 h-1.5 rounded-full">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              progress === 100 ? "bg-green-500" : "bg-gray-400"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500 pt-1">
                          <Calendar className="w-3 h-3" />
                          <span>Обновлен {formatDate(list.updated_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-normal text-gray-900 mb-2">
                Ничего не найдено
              </h3>
              <p className="text-sm text-gray-600">
                Попробуйте изменить поисковый запрос.
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-normal text-gray-900 mb-2">
                Создайте свой первый список
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Начните с создания списка покупок для ваших нужд.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Создать список</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
