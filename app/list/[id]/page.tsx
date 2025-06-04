"use client";

import { useState, use, useEffect } from "react";
import {
  ArrowLeft,
  Share2,
  Plus,
  Check,
  X,
  Edit2,
  Calendar,
  DollarSign,
  MoreVertical,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRealtimeList } from "../../hooks/useRealtimeList";
import { ShareModal } from "../../components/ShareModal";
import { AIAssistant } from "../../components/AIAssistant";
import { Toast } from "../../components/Toast";
import { ConnectionStatus } from "../../components/ConnectionStatus";
import Layout from "../../components/Layout";

interface ShoppingListPageProps {
  params: Promise<{ id: string }>;
}

export default function ShoppingListPage({ params }: ShoppingListPageProps) {
  // Распаковываем params с помощью use() для Next.js 15
  const resolvedParams = use(params);

  const [newItemText, setNewItemText] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const [itemFilter, setItemFilter] = useState<"all" | "completed" | "pending">(
    "all"
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Используем realtime хук с распакованными params
  const {
    list,
    loading,
    error,
    connectionState,
    addItem,
    updateItem,
    deleteItem,
    updateListName,
    updateListSettings,
  } = useRealtimeList({
    listId: resolvedParams.id,
    onError: (error) => {
      setToast({ message: error, type: "error" });
    },
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleAddItem = async () => {
    if (newItemText.trim()) {
      try {
        await addItem(
          newItemText.trim(),
          newItemPrice ? parseFloat(newItemPrice) : undefined
        );
        setNewItemText("");
        setNewItemPrice("");
        setIsAdding(false);
        setToast({ message: "Товар добавлен", type: "success" });
      } catch (error) {
        // Ошибка уже обработана в onError
      }
    }
  };

  // Функция для массового добавления товаров из AI
  const handleAddMultipleItems = async (
    items: { text: string; price?: number }[]
  ) => {
    let addedCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        await addItem(item.text, item.price);
        addedCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (addedCount > 0) {
      setToast({
        message: `Добавлено ${addedCount} товаров${
          errorCount > 0 ? `, ошибки: ${errorCount}` : ""
        }`,
        type: addedCount > errorCount ? "success" : "error",
      });
    }
  };

  const handleToggleItem = async (itemId: string) => {
    const item = list?.items.find((i) => i.id === itemId);
    if (item) {
      try {
        await updateItem(itemId, { purchased: !item.purchased });
      } catch (error) {
        // Ошибка уже обработана в onError
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId);
      setToast({ message: "Товар удален", type: "success" });
    } catch (error) {
      // Ошибка уже обработана в onError
    }
  };

  const handleSaveName = async () => {
    if (editingName.trim() && editingName.trim() !== list?.name) {
      try {
        await updateListName(editingName.trim());
        setToast({ message: "Название списка обновлено", type: "success" });
      } catch (error) {
        // Ошибка уже обработана в onError
      }
    }
    setIsEditingName(false);
  };

  // Функция для начала редактирования товара
  const handleStartEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
    setEditingItemPrice(item.price ? item.price.toString() : "");
  };

  // Функция для сохранения изменений товара
  const handleSaveItemEdit = async () => {
    if (!editingItemId || !editingItemText.trim()) return;

    try {
      const price = editingItemPrice ? parseFloat(editingItemPrice) : undefined;
      await updateItem(editingItemId, {
        text: editingItemText.trim(),
        price: price && !isNaN(price) && price > 0 ? price : undefined,
      });
      setEditingItemId(null);
      setEditingItemText("");
      setEditingItemPrice("");
      setToast({ message: "Товар обновлен", type: "success" });
    } catch (error) {
      // Ошибка уже обработана в onError
    }
  };

  // Функция для отмены редактирования
  const handleCancelItemEdit = () => {
    setEditingItemId(null);
    setEditingItemText("");
    setEditingItemPrice("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isEditingName) {
        handleSaveName();
      } else if (isAdding) {
        handleAddItem();
      } else if (editingItemId) {
        handleSaveItemEdit();
      }
    }
    if (e.key === "Escape") {
      if (isEditingName) {
        setEditingName(list?.name || "");
        setIsEditingName(false);
      } else if (isAdding) {
        setNewItemText("");
        setNewItemPrice("");
        setIsAdding(false);
      } else if (editingItemId) {
        handleCancelItemEdit();
      }
    }
  };

  // Фильтрация товаров
  const filteredItems =
    list?.items.filter((item) => {
      switch (itemFilter) {
        case "completed":
          return item.purchased;
        case "pending":
          return !item.purchased;
        default:
          return true;
      }
    }) || [];

  // Функция для удаления списка
  const handleDeleteList = async () => {
    if (!list) return;

    if (
      !confirm(
        "Вы уверены, что хотите удалить этот список? Это действие нельзя отменить."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setToast({ message: "Список удален", type: "success" });
        // Перенаправляем на главную страницу через небольшую задержку
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Ошибка удаления списка");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ошибка удаления списка";
      setToast({ message: errorMessage, type: "error" });
    }
  };

  // Закрытие меню при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showListMenu) {
        setShowListMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showListMenu]);

  // Показываем загрузку
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка списка...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Показываем ошибку, если список не найден
  if (error || !list) {
    return (
      <Layout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-lg font-normal text-gray-900 mb-2">
              Список не найден
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              {error ||
                "Возможно, список был удален или у вас нет доступа к нему."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к спискам
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const completedCount = list.items.filter((item) => item.purchased).length;
  const totalCount = list.items.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Подсчет стоимости
  const totalCost = list.items.reduce(
    (sum, item) => sum + (item.price || 0),
    0
  );
  const purchasedCost = list.items
    .filter((item) => item.purchased)
    .reduce((sum, item) => sum + (item.price || 0), 0);
  const remainingCost = totalCost - purchasedCost;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "KZT",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div className="flex-1">
                {isEditingName ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyPress}
                    className="text-lg font-normal text-gray-900 bg-transparent border-b border-gray-300 focus:border-gray-900 outline-none transition-colors duration-200"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-normal text-gray-900">
                      {list.name}
                    </h1>
                    <button
                      onClick={() => {
                        setEditingName(list.name);
                        setIsEditingName(true);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 p-1 rounded-md hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span>
                    {completedCount} из {totalCount} выполнено (
                    {completionPercentage}%)
                  </span>
                  {totalCost > 0 && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatPrice(remainingCost)} из {formatPrice(totalCost)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                  showAIAssistant
                    ? "border-purple-500 bg-purple-50 text-purple-600"
                    : "border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
                title="AI-помощник"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowListMenu(!showListMenu)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showListMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={() => {
                        setShowListMenu(false);
                        handleDeleteList();
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
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Прогресс</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    completionPercentage === 100
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1 hover:text-gray-700 transition-colors duration-200">
              <Calendar className="w-3 h-3" />
              <span>Создан: {formatDate(list.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1 hover:text-gray-700 transition-colors duration-200">
              <Calendar className="w-3 h-3" />
              <span>Обновлен: {formatDate(list.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        {showAIAssistant && (
          <div className="px-6">
            <AIAssistant
              listId={list.id}
              existingItems={list.items.map((item) => item.text)}
              onAddItems={handleAddMultipleItems}
              onClose={() => setShowAIAssistant(false)}
            />
          </div>
        )}

        {/* Filters */}
        {list.items.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Показать:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setItemFilter("all")}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                    itemFilter === "all"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Все ({list.items.length})
                </button>
                <button
                  onClick={() => setItemFilter("pending")}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                    itemFilter === "pending"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Не куплено (
                  {list.items.filter((item) => !item.purchased).length})
                </button>
                <button
                  onClick={() => setItemFilter("completed")}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                    itemFilter === "completed"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Куплено ({list.items.filter((item) => item.purchased).length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200 w-20">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200">
                  Товар
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200 w-32">
                  Цена
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                  Действия
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
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
                            onChange={() => handleToggleItem(item.id)}
                            className="w-4 h-4 accent-green-500 rounded transition-all duration-200 hover:scale-110"
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
                      {editingItemId === item.id ? (
                        <input
                          type="text"
                          value={editingItemText}
                          onChange={(e) => setEditingItemText(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={handleSaveItemEdit}
                          className="w-full text-sm font-normal text-gray-900 outline-none bg-white px-3 py-2 rounded-md border border-gray-200 focus:border-blue-500 transition-all duration-200"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex-1 text-sm font-normal transition-all duration-300 cursor-pointer hover:bg-white px-3 py-2 rounded-md ${
                              item.purchased
                                ? "text-green-700 font-medium line-through"
                                : "text-gray-900"
                            }`}
                            onClick={() => handleStartEditItem(item)}
                            title="Нажмите для редактирования"
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
                      )}
                    </td>

                    {/* Price Column */}
                    <td className="px-6 py-4 text-right border-r border-gray-200">
                      {editingItemId === item.id ? (
                        <input
                          type="number"
                          value={editingItemPrice}
                          onChange={(e) => setEditingItemPrice(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={handleSaveItemEdit}
                          placeholder="Цена"
                          className="w-full text-sm font-normal text-gray-900 outline-none bg-white px-3 py-2 rounded-md border border-gray-200 focus:border-blue-500 transition-all duration-200 text-right"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        <span
                          className={`text-sm cursor-pointer hover:bg-white px-3 py-2 rounded-md transition-all duration-300 inline-block ${
                            item.purchased
                              ? "text-green-600 font-medium"
                              : "text-gray-500"
                          }`}
                          onClick={() => handleStartEditItem(item)}
                          title="Нажмите для редактирования"
                        >
                          {item.price ? formatPrice(item.price) : "—"}
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingItemId === item.id ? (
                          // Режим редактирования
                          <>
                            <button
                              onClick={handleSaveItemEdit}
                              className="w-8 h-8 flex items-center justify-center hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 rounded-md"
                              title="Сохранить"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelItemEdit}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 rounded-md"
                              title="Отменить"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          // Обычный режим
                          <>
                            <button
                              onClick={() => handleStartEditItem(item)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 rounded-md"
                              title="Редактировать"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200 ease-in-out transform hover:scale-110 active:scale-95 rounded-md"
                              title="Удалить"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    {itemFilter === "completed"
                      ? "Нет купленных товаров"
                      : itemFilter === "pending"
                      ? "Все товары куплены! 🎉"
                      : "Список пустой"}
                  </td>
                </tr>
              )}

              {/* Add New Item */}
              {isAdding && (
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
                      autoFocus
                      onKeyDown={handleKeyPress}
                    />
                  </td>
                  <td className="px-6 py-4 text-right border-r border-gray-200">
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Цена"
                      className="w-full text-sm font-normal text-gray-900 outline-none bg-white px-3 py-2 rounded-md border border-gray-200 focus:border-blue-500 transition-all duration-200 text-right"
                      onKeyDown={handleKeyPress}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleAddItem}
                        className="w-8 h-8 flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition-all duration-200 hover:scale-110 active:scale-95 rounded-md"
                        title="Добавить"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setNewItemText("");
                          setNewItemPrice("");
                          setIsAdding(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-110 active:scale-95 rounded-md"
                        title="Отменить"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Add New Item Button */}
          {!isAdding && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-all duration-200 hover:scale-105 px-3 py-2 rounded-lg hover:bg-white"
              >
                <Plus className="w-4 h-4 transition-transform duration-200 hover:rotate-90" />
                <span>Добавить товар</span>
              </button>
            </div>
          )}
        </div>

        {/* Share Modal */}
        <ShareModal
          list={list}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onUpdateSettings={updateListSettings}
        />

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  );
}
