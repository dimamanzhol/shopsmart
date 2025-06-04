"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Check, ShoppingCart, Users, AlertCircle } from "lucide-react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";

interface PublicShoppingItem {
  id: string;
  text: string;
  purchased: boolean;
  price?: number;
  created_at: string;
  updated_at: string;
}

interface PublicShoppingList {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  share_token: string;
  allow_anonymous_edit: boolean;
  shopping_items: PublicShoppingItem[];
}

export default function ShareListPage() {
  const params = useParams();
  const token = params.token as string;

  const [list, setList] = useState<PublicShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const channelRef = useRef<any>(null);

  // Загрузка списка
  const fetchList = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/share/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки списка");
      }

      setList(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchList();
    }
  }, [token]);

  // Realtime подписка для публичного списка
  useEffect(() => {
    if (!list?.id) return;

    // Очищаем предыдущую подписку
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    console.log(`Setting up realtime for shared list: ${list.id}`);

    // Создаём новый канал для публичного списка
    const channel = supabase
      .channel(`shared_list_${list.id}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shopping_lists",
          filter: `id=eq.${list.id}`,
        },
        (payload) => {
          console.log("Shared list update received:", payload);
          setList((prev) =>
            prev
              ? {
                  ...prev,
                  name: payload.new.name,
                  updated_at: payload.new.updated_at,
                  is_public: payload.new.is_public,
                  allow_anonymous_edit: payload.new.allow_anonymous_edit,
                }
              : null
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          console.log("Shared item insert received:", payload);
          const newItem: PublicShoppingItem = {
            id: payload.new.id,
            text: payload.new.text,
            purchased: payload.new.purchased,
            price: payload.new.price,
            created_at: payload.new.created_at,
            updated_at: payload.new.updated_at,
          };

          setList((prev) =>
            prev
              ? {
                  ...prev,
                  shopping_items: [...prev.shopping_items, newItem],
                }
              : null
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          console.log("Shared item update received:", payload);
          setList((prev) =>
            prev
              ? {
                  ...prev,
                  shopping_items: prev.shopping_items.map((item) =>
                    item.id === payload.new.id
                      ? {
                          id: payload.new.id,
                          text: payload.new.text,
                          purchased: payload.new.purchased,
                          price: payload.new.price,
                          created_at: payload.new.created_at,
                          updated_at: payload.new.updated_at,
                        }
                      : item
                  ),
                }
              : null
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          console.log("Shared item delete received:", payload);
          setList((prev) =>
            prev
              ? {
                  ...prev,
                  shopping_items: prev.shopping_items.filter(
                    (item) => item.id !== payload.old.id
                  ),
                }
              : null
          );
        }
      )
      .subscribe((status) => {
        console.log(`Shared list realtime status: ${status}`);
      });

    channelRef.current = channel;

    // Очистка при размонтировании
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [list?.id]);

  // Добавление товара
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !list?.allow_anonymous_edit) return;

    setAddingItem(true);
    try {
      const response = await fetch(`/api/lists/${list.id}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newItemText.trim(),
          price: newItemPrice ? parseFloat(newItemPrice) : undefined,
        }),
      });

      if (response.ok) {
        setNewItemText("");
        setNewItemPrice("");
        // Убираем fetchList() - realtime сам обновит
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка добавления товара");
      }
    } catch (err) {
      alert("Ошибка добавления товара");
    } finally {
      setAddingItem(false);
    }
  };

  // Переключение статуса покупки
  const handleTogglePurchased = async (itemId: string, purchased: boolean) => {
    if (!list?.allow_anonymous_edit) return;

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purchased: !purchased }),
      });

      if (response.ok) {
        // Убираем fetchList() - realtime сам обновит
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка обновления товара");
      }
    } catch (err) {
      alert("Ошибка обновления товара");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Загрузка списка...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Список недоступен
            </h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <p className="text-xs text-gray-500">
              Возможно, список был удален или ссылка устарела
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!list) return null;

  const completedItems = list.shopping_items.filter((item) => item.purchased);
  const totalPrice = list.shopping_items
    .filter((item) => item.purchased && item.price)
    .reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg font-normal text-gray-900">{list.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>
                  {completedItems.length} из {list.shopping_items.length}{" "}
                  выполнено (
                  {list.shopping_items.length > 0
                    ? Math.round(
                        (completedItems.length / list.shopping_items.length) *
                          100
                      )
                    : 0}
                  %)
                </span>
                {totalPrice > 0 && (
                  <span className="flex items-center gap-1">
                    <span>₸</span>
                    {totalPrice.toLocaleString("ru-RU")} потрачено
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {list.shopping_items.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Прогресс</span>
                <span>
                  {list.shopping_items.length > 0
                    ? Math.round(
                        (completedItems.length / list.shopping_items.length) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    completedItems.length === list.shopping_items.length &&
                    list.shopping_items.length > 0
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                  style={{
                    width: `${
                      list.shopping_items.length > 0
                        ? Math.round(
                            (completedItems.length /
                              list.shopping_items.length) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Access Info */}
          {!list.allow_anonymous_edit && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Этот список доступен только для просмотра
              </p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border-b border-gray-200">
          {list.shopping_items.length > 0 && (
            <div className="border border-gray-200 rounded-lg mx-6 mt-6 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200 w-20">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200">
                      Товар
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                      Цена
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {list.shopping_items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-200 transition-all duration-300 ${
                        item.purchased
                          ? "bg-green-50 hover:bg-green-100"
                          : index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50/30 hover:bg-gray-50"
                      }`}
                    >
                      {/* Status Column */}
                      <td className="px-6 py-4 text-center border-r border-gray-200">
                        <div className="flex justify-center">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={item.purchased}
                              onChange={() =>
                                handleTogglePurchased(item.id, item.purchased)
                              }
                              disabled={!list.allow_anonymous_edit}
                              className="w-4 h-4 accent-green-500 rounded transition-all duration-200 hover:scale-110 disabled:cursor-not-allowed"
                            />
                            {item.purchased && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                                <Check className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Item Name Column */}
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex-1 text-sm font-normal transition-all duration-300 px-3 py-2 rounded-md ${
                              item.purchased
                                ? "text-green-700 font-medium line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {item.text}
                          </span>

                          {item.purchased && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200 shrink-0">
                              <Check className="w-3 h-3" />
                              КУПЛЕНО
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price Column */}
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm px-3 py-2 rounded-md transition-all duration-300 inline-block ${
                            item.purchased
                              ? "text-green-600 font-medium"
                              : "text-gray-500"
                          }`}
                        >
                          {item.price
                            ? `${item.price.toLocaleString("ru-RU")} ₸`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Add New Item Form */}
                  {list.allow_anonymous_edit && (
                    <tr className="bg-blue-50 border-b border-gray-200">
                      <td className="px-6 py-4 text-center border-r border-gray-200">
                        <div className="flex justify-center">
                          <div className="w-4 h-4 border-2 border-blue-400 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <input
                          type="text"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          placeholder="Введите название товара..."
                          className="w-full text-sm font-normal text-gray-900 outline-none bg-white px-3 py-2 rounded-md border border-gray-200 focus:border-blue-500 transition-all duration-200"
                          disabled={addingItem}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem(e);
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            placeholder="Цена"
                            className="w-20 text-sm font-normal text-gray-900 outline-none bg-white px-3 py-2 rounded-md border border-gray-200 focus:border-blue-500 transition-all duration-200 text-right"
                            disabled={addingItem}
                            min="0"
                            step="0.01"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddItem(e);
                              }
                            }}
                          />
                          <button
                            onClick={handleAddItem}
                            disabled={!newItemText.trim() || addingItem}
                            className="w-8 h-8 flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition-all duration-200 hover:scale-110 active:scale-95 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Добавить"
                          >
                            {addingItem ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State or Add Button */}
          {list.shopping_items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-normal text-gray-900 mb-2">
                Список пустой
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {list.allow_anonymous_edit
                  ? "Добавьте первый товар в список"
                  : "В этом списке пока нет товаров"}
              </p>
              {list.allow_anonymous_edit && (
                <div className="max-w-md mx-auto">
                  <form onSubmit={handleAddItem} className="flex gap-2">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="Добавить товар..."
                      className="flex-1 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition-colors rounded-lg"
                      disabled={addingItem}
                    />
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Цена"
                      className="w-20 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition-colors rounded-lg"
                      disabled={addingItem}
                      min="0"
                      step="0.01"
                    />
                    <button
                      type="submit"
                      disabled={!newItemText.trim() || addingItem}
                      className="px-4 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    >
                      {addingItem ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            list.allow_anonymous_edit && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Добавьте товар в таблицу выше или используйте форму в
                  последней строке
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}
