"use client";

import { useState } from "react";
import {
  Sparkles,
  Send,
  Plus,
  X,
  ChefHat,
  List,
  Lightbulb,
  Loader,
} from "lucide-react";

interface AISuggestion {
  text: string;
  category?: string;
  quantity?: string;
}

interface AIAssistantProps {
  listId: string;
  existingItems: string[];
  onAddItems: (items: { text: string; price?: number }[]) => Promise<void>;
  onClose?: () => void;
}

export function AIAssistant({
  listId,
  existingItems,
  onAddItems,
  onClose,
}: AIAssistantProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(
    new Set()
  );
  const [suggestionPrices, setSuggestionPrices] = useState<{
    [key: number]: string;
  }>({});
  const [isDemo, setIsDemo] = useState(false);
  const [activeMode, setActiveMode] = useState<
    "auto_complete" | "shopping_list" | "recipe_ingredients"
  >("shopping_list");

  const modes = [
    {
      key: "shopping_list" as const,
      name: "Список покупок",
      icon: List,
      placeholder: "Например: продукты для борща, завтрак на неделю...",
      description: "AI составит полный список покупок",
    },
    {
      key: "recipe_ingredients" as const,
      name: "Рецепт",
      icon: ChefHat,
      placeholder: "Например: омлет, борщ, паста карбонара...",
      description: "AI предложит ингредиенты для блюда",
    },
    {
      key: "auto_complete" as const,
      name: "Дополнить",
      icon: Lightbulb,
      placeholder: "Например: молочные продукты, овощи для салата...",
      description: "AI дополнит ваш список",
    },
  ];

  const currentMode = modes.find((m) => m.key === activeMode)!;

  const handleSuggest = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: activeMode,
          query: query.trim(),
          listId,
          existingItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка запроса к AI");
      }

      setSuggestions(data.suggestions || []);
      setIsDemo(data.isDemo || false);

      if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleAddSelected = async () => {
    const selectedItems = Array.from(selectedSuggestions).map((index) => {
      const suggestion = suggestions[index];
      const priceStr = suggestionPrices[index];
      const price =
        priceStr && priceStr.trim() ? parseFloat(priceStr.trim()) : undefined;

      return {
        text: typeof suggestion === "string" ? suggestion : suggestion.text,
        price: price && !isNaN(price) && price > 0 ? price : undefined,
      };
    });

    if (selectedItems.length === 0) return;

    try {
      await onAddItems(selectedItems);
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setSuggestionPrices({});
      setQuery("");
    } catch (error) {
      setError("Ошибка добавления товаров");
    }
  };

  const handlePriceChange = (index: number, price: string) => {
    setSuggestionPrices((prev) => ({
      ...prev,
      [index]: price,
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSuggest();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">AI-помощник</h3>
            <p className="text-xs text-gray-600">Умное составление списков</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                onClick={() => setActiveMode(mode.key)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  activeMode === mode.key
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs font-medium">{mode.name}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-600 mt-2">{currentMode.description}</p>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentMode.placeholder}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
            disabled={loading}
          />
          <button
            onClick={handleSuggest}
            disabled={!query.trim() || loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && !isDemo && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                Предложения AI ({suggestions.length})
              </h4>
              <button
                onClick={() =>
                  setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))
                }
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Выбрать все
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => {
                const isSelected = selectedSuggestions.has(index);
                const suggestionText =
                  typeof suggestion === "string" ? suggestion : suggestion.text;
                const category =
                  typeof suggestion === "object"
                    ? suggestion.category
                    : undefined;
                const quantity =
                  typeof suggestion === "object"
                    ? suggestion.quantity
                    : undefined;

                return (
                  <div
                    key={index}
                    onClick={() => handleToggleSuggestion(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          {suggestionText}
                        </div>
                        {(category || quantity) && (
                          <div className="flex gap-2 mt-1">
                            {category && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {category}
                              </span>
                            )}
                            {quantity && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                {quantity}
                              </span>
                            )}
                          </div>
                        )}
                        {isSelected && (
                          <div className="mt-2">
                            <input
                              type="number"
                              placeholder="Цена (₸)"
                              value={suggestionPrices[index] || ""}
                              onChange={(e) =>
                                handlePriceChange(index, e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-24 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Selected Button */}
            {selectedSuggestions.size > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={handleAddSelected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить выбранные ({selectedSuggestions.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
