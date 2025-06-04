import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { ShoppingList, ShoppingItem } from "../lib/types";

interface UseRealtimeListOptions {
  listId: string;
  onError?: (error: string) => void;
}

interface ConnectionState {
  isConnected: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
  retryCount: number;
}

export function useRealtimeList({ listId, onError }: UseRealtimeListOptions) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isOnline: true,
    lastSyncTime: null,
    retryCount: 0,
  });

  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Максимальное количество попыток переподключения
  const MAX_RETRY_COUNT = 5;
  const RETRY_DELAY = 1000; // Начальная задержка в мс

  // Загрузка списка с сервера
  const fetchList = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        const response = await fetch(`/api/lists/${listId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка загрузки списка");
        }

        // Преобразуем данные из API в формат типов
        const transformedList: ShoppingList = {
          id: data.id,
          name: data.name,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          isPublic: data.is_public,
          shareToken: data.share_token,
          allowAnonymousEdit: data.allow_anonymous_edit,
          items:
            data.shopping_items?.map((item: any) => ({
              id: item.id,
              text: item.text,
              purchased: item.purchased,
              price: item.price,
              createdAt: new Date(item.created_at),
              updatedAt: new Date(item.updated_at),
            })) || [],
        };

        setList(transformedList);
        setConnectionState((prev) => ({
          ...prev,
          lastSyncTime: new Date(),
          retryCount: 0,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [listId, onError]
  );

  // Функция для переподключения
  const reconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    if (connectionState.retryCount >= MAX_RETRY_COUNT) {
      onError?.("Максимальное количество попыток переподключения превышено");
      return;
    }

    const delay = RETRY_DELAY * Math.pow(2, connectionState.retryCount);

    retryTimeoutRef.current = setTimeout(() => {
      setConnectionState((prev) => ({
        ...prev,
        retryCount: prev.retryCount + 1,
      }));
      // Простое логирование вместо вызова setupRealtimeSubscription
      console.log("Reconnect attempt", connectionState.retryCount + 1);
    }, delay);
  }, [connectionState.retryCount, onError]);

  // Настройка realtime подписки - отдельный useEffect
  useEffect(() => {
    // Локальная настройка realtime подписки без внешних зависимостей
    const initializeRealtime = () => {
      // Очищаем предыдущую подписку
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Создаём новый канал
      const channel = supabase
        .channel(`shopping_list_${listId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shopping_lists",
            filter: `id=eq.${listId}`,
          },
          (payload) => {
            setList((prev) =>
              prev
                ? {
                    ...prev,
                    name: payload.new.name,
                    isPublic: payload.new.is_public,
                    allowAnonymousEdit: payload.new.allow_anonymous_edit,
                    updatedAt: new Date(payload.new.updated_at),
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
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            const newItem: ShoppingItem = {
              id: payload.new.id,
              text: payload.new.text,
              purchased: payload.new.purchased,
              price: payload.new.price,
              createdAt: new Date(payload.new.created_at),
              updatedAt: new Date(payload.new.updated_at),
            };

            setList((prev) =>
              prev
                ? {
                    ...prev,
                    items: [...prev.items, newItem],
                    updatedAt: new Date(),
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
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            setList((prev) =>
              prev
                ? {
                    ...prev,
                    items: prev.items.map((item) =>
                      item.id === payload.new.id
                        ? {
                            id: payload.new.id,
                            text: payload.new.text,
                            purchased: payload.new.purchased,
                            price: payload.new.price,
                            createdAt: new Date(payload.new.created_at),
                            updatedAt: new Date(payload.new.updated_at),
                          }
                        : item
                    ),
                    updatedAt: new Date(),
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
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            setList((prev) =>
              prev
                ? {
                    ...prev,
                    items: prev.items.filter(
                      (item) => item.id !== payload.old.id
                    ),
                    updatedAt: new Date(),
                  }
                : null
            );
          }
        )
        .subscribe((status) => {
          console.log(`Realtime status for list ${listId}:`, status);
          setConnectionState((prev) => ({
            ...prev,
            isConnected: status === "SUBSCRIBED",
          }));

          // Простая обработка ошибок без внешних зависимостей
          if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            console.log("Realtime connection issue, will retry...");
            // Простой retry без рекурсии - переподключаемся через новый канал
            setTimeout(() => {
              // Пересоздаем канал локально
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
              }

              const retryChannel = supabase
                .channel(`shopping_list_${listId}_retry`)
                .on(
                  "postgres_changes",
                  {
                    event: "*",
                    schema: "public",
                    table: "shopping_lists",
                    filter: `id=eq.${listId}`,
                  },
                  () => console.log("Retry channel connected")
                )
                .subscribe();

              channelRef.current = retryChannel;
            }, 3000);
          }
        });

      channelRef.current = channel;
    };

    initializeRealtime();

    // Очистка при размонтировании
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [listId]); // Только listId в зависимостях

  // Добавление товара с оптимистическим обновлением
  const addItem = useCallback(
    async (text: string, price?: number) => {
      // Создаём временный ID для оптимистического обновления
      const tempId = `temp_${Date.now()}`;
      const tempItem: ShoppingItem = {
        id: tempId,
        text,
        purchased: false,
        price,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Оптимистическое обновление UI
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: [...prev.items, tempItem],
              updatedAt: new Date(),
            }
          : null
      );

      try {
        const response = await fetch(`/api/lists/${listId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, price }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка добавления товара");
        }

        // Заменяем временный элемент реальным
        const newItem: ShoppingItem = {
          id: data.id,
          text: data.text,
          purchased: data.purchased,
          price: data.price,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        setList((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((item) =>
                  item.id === tempId ? newItem : item
                ),
                updatedAt: new Date(),
              }
            : null
        );

        return data;
      } catch (err) {
        // Удаляем временный элемент при ошибке
        setList((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.filter((item) => item.id !== tempId),
              }
            : null
        );

        const errorMessage =
          err instanceof Error ? err.message : "Ошибка добавления товара";
        onError?.(errorMessage);
        throw err;
      }
    },
    [listId, onError]
  );

  // Обновление товара с оптимистическим обновлением
  const updateItem = useCallback(
    async (itemId: string, updates: Partial<ShoppingItem>) => {
      // Сохраняем текущее состояние для rollback
      const currentList = list;

      // Оптимистическое обновление
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      ...updates,
                      updatedAt: new Date(),
                    }
                  : item
              ),
              updatedAt: new Date(),
            }
          : null
      );

      try {
        const response = await fetch(`/api/items/${itemId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка обновления товара");
        }

        return data;
      } catch (err) {
        // Rollback при ошибке
        setList(currentList);

        const errorMessage =
          err instanceof Error ? err.message : "Ошибка обновления товара";
        onError?.(errorMessage);
        throw err;
      }
    },
    [list, onError]
  );

  // Удаление товара с оптимистическим обновлением
  const deleteItem = useCallback(
    async (itemId: string) => {
      // Сохраняем текущее состояние для rollback
      const currentList = list;

      // Оптимистическое обновление
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((item) => item.id !== itemId),
              updatedAt: new Date(),
            }
          : null
      );

      try {
        const response = await fetch(`/api/items/${itemId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const text = await response.text();
          let errorMessage = "Ошибка удаления товара";

          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
            }
          }

          throw new Error(errorMessage);
        }

        const contentLength = response.headers.get("content-length");
        const contentType = response.headers.get("content-type");

        let data = null;
        if (
          contentLength &&
          contentLength !== "0" &&
          contentType &&
          contentType.includes("application/json")
        ) {
          const text = await response.text();
          if (text) {
            data = JSON.parse(text);
          }
        }

        return data;
      } catch (err) {
        // Rollback при ошибке
        setList(currentList);

        const errorMessage =
          err instanceof Error ? err.message : "Ошибка удаления товара";
        onError?.(errorMessage);
        throw err;
      }
    },
    [list, onError]
  );

  // Обновление названия списка
  const updateListName = useCallback(
    async (name: string) => {
      const currentList = list;

      // Оптимистическое обновление
      setList((prev) =>
        prev
          ? {
              ...prev,
              name,
              updatedAt: new Date(),
            }
          : null
      );

      try {
        const response = await fetch(`/api/lists/${listId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка обновления названия");
        }

        return data;
      } catch (err) {
        // Rollback при ошибке
        setList(currentList);

        const errorMessage =
          err instanceof Error ? err.message : "Ошибка обновления названия";
        onError?.(errorMessage);
        throw err;
      }
    },
    [listId, list, onError]
  );

  // Обновление настроек списка
  const updateListSettings = useCallback(
    async (settings: { isPublic?: boolean; allowAnonymousEdit?: boolean }) => {
      const currentList = list;

      // Оптимистическое обновление
      setList((prev) =>
        prev
          ? {
              ...prev,
              isPublic: settings.isPublic ?? prev.isPublic,
              allowAnonymousEdit:
                settings.allowAnonymousEdit ?? prev.allowAnonymousEdit,
              updatedAt: new Date(),
            }
          : null
      );

      try {
        const response = await fetch(`/api/lists/${listId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка обновления настроек");
        }

        return data;
      } catch (err) {
        // Rollback при ошибке
        setList(currentList);

        const errorMessage =
          err instanceof Error ? err.message : "Ошибка обновления настроек";
        onError?.(errorMessage);
        throw err;
      }
    },
    [listId, list, onError]
  );

  // Мониторинг онлайн/оффлайн статуса
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState((prev) => ({
        ...prev,
        isOnline: true,
        retryCount: 0,
      }));
      // Создаем локальную функцию для избежания зависимости
      const syncOnline = async () => {
        try {
          const response = await fetch(`/api/lists/${listId}`);
          const data = await response.json();
          if (response.ok) {
            const transformedList: ShoppingList = {
              id: data.id,
              name: data.name,
              createdAt: new Date(data.created_at),
              updatedAt: new Date(data.updated_at),
              isPublic: data.is_public,
              shareToken: data.share_token,
              allowAnonymousEdit: data.allow_anonymous_edit,
              items:
                data.shopping_items?.map((item: any) => ({
                  id: item.id,
                  text: item.text,
                  purchased: item.purchased,
                  price: item.price,
                  createdAt: new Date(item.created_at),
                  updatedAt: new Date(item.updated_at),
                })) || [],
            };
            setList(transformedList);
            setConnectionState((prev) => ({
              ...prev,
              lastSyncTime: new Date(),
              retryCount: 0,
            }));
          }
        } catch (err) {
          console.error(
            "Ошибка синхронизации при восстановлении соединения:",
            err
          );
        }
      };
      syncOnline();
      // Переподключаем realtime
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      // Создаем новый канал без зависимостей
      const channel = supabase
        .channel(`shopping_list_${listId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shopping_lists",
            filter: `id=eq.${listId}`,
          },
          (payload) => {
            setList((prev) =>
              prev
                ? {
                    ...prev,
                    name: payload.new.name,
                    isPublic: payload.new.is_public,
                    allowAnonymousEdit: payload.new.allow_anonymous_edit,
                    updatedAt: new Date(payload.new.updated_at),
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
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            const newItem: ShoppingItem = {
              id: payload.new.id,
              text: payload.new.text,
              purchased: payload.new.purchased,
              price: payload.new.price,
              createdAt: new Date(payload.new.created_at),
              updatedAt: new Date(payload.new.updated_at),
            };

            setList((prev) =>
              prev
                ? {
                    ...prev,
                    items: [...prev.items, newItem],
                    updatedAt: new Date(),
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
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            setList((prev) =>
              prev
                ? {
                    ...prev,
                    items: prev.items.map((item) =>
                      item.id === payload.new.id
                        ? {
                            id: payload.new.id,
                            text: payload.new.text,
                            purchased: payload.new.purchased,
                            price: payload.new.price,
                            createdAt: new Date(payload.new.created_at),
                            updatedAt: new Date(payload.new.updated_at),
                          }
                        : item
                    ),
                    updatedAt: new Date(),
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
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            setList((prev) =>
              prev
                ? {
                    ...prev,
                    items: prev.items.filter(
                      (item) => item.id !== payload.old.id
                    ),
                    updatedAt: new Date(),
                  }
                : null
            );
          }
        )
        .subscribe((status) => {
          console.log(`Realtime status for list ${listId}:`, status);
          setConnectionState((prev) => ({
            ...prev,
            isConnected: status === "SUBSCRIBED",
          }));

          // Простая обработка ошибок без внешних зависимостей
          if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            console.log("Realtime connection issue, will retry...");
            // Простой retry без рекурсии - переподключаемся через новый канал
            setTimeout(() => {
              // Пересоздаем канал локально
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
              }

              const retryChannel = supabase
                .channel(`shopping_list_${listId}_retry`)
                .on(
                  "postgres_changes",
                  {
                    event: "*",
                    schema: "public",
                    table: "shopping_lists",
                    filter: `id=eq.${listId}`,
                  },
                  () => console.log("Retry channel connected")
                )
                .subscribe();

              channelRef.current = retryChannel;
            }, 3000);
          }
        });
      channelRef.current = channel;
    };

    const handleOffline = () => {
      setConnectionState((prev) => ({
        ...prev,
        isOnline: false,
        isConnected: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [listId]);

  // Инициализация - отдельный useEffect только для первой загрузки
  useEffect(() => {
    // Локальная функция инициализации без внешних зависимостей
    const initializeList = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/lists/${listId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка загрузки списка");
        }

        // Преобразуем данные из API в формат типов
        const transformedList: ShoppingList = {
          id: data.id,
          name: data.name,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          isPublic: data.is_public,
          shareToken: data.share_token,
          allowAnonymousEdit: data.allow_anonymous_edit,
          items:
            data.shopping_items?.map((item: any) => ({
              id: item.id,
              text: item.text,
              purchased: item.purchased,
              price: item.price,
              createdAt: new Date(item.created_at),
              updatedAt: new Date(item.updated_at),
            })) || [],
        };

        setList(transformedList);
        setConnectionState((prev) => ({
          ...prev,
          lastSyncTime: new Date(),
          retryCount: 0,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeList();
  }, [listId]); // Только listId в зависимостях

  return {
    list,
    loading,
    error,
    connectionState,
    addItem,
    updateItem,
    deleteItem,
    updateListName,
    updateListSettings,
    refetch: fetchList,
  };
}
