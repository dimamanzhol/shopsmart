"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import Layout from "../components/Layout";

export default function CreateListPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const newList = await response.json();
        router.push(`/list/${newList.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при создании списка");
      }
    } catch (err) {
      alert("Ошибка при создании списка");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-normal text-gray-900">
                Создать новый список
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Придумайте название для вашего списка покупок
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-sm font-normal text-gray-900 mb-2">
                Новый список покупок
              </h2>
              <p className="text-sm text-gray-600">
                Начните с создания названия для вашего списка
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Название списка
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Продукты на неделю"
                  className="w-full px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                  autoFocus
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {name.length}/100 символов
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={!name.trim() || isCreating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isCreating ? "Создание..." : "Создать список"}</span>
                </button>

                <Link
                  href="/"
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 text-sm text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
                >
                  Отмена
                </Link>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                После создания вы сможете добавить товары в список
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
