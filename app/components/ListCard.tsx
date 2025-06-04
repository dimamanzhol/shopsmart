"use client";

import { ShoppingCart, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";

interface ListCardProps {
  id: string;
  name: string;
  itemsCount: number;
  completedCount: number;
  lastUpdated: string;
  isShared?: boolean;
}

export const ListCard = ({
  id,
  name,
  itemsCount,
  completedCount,
  lastUpdated,
  isShared = false,
}: ListCardProps) => {
  const completionPercentage =
    itemsCount > 0 ? Math.round((completedCount / itemsCount) * 100) : 0;

  return (
    <Link href={`/list/${id}`}>
      <div className="bg-white border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-100 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-gray-600" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-normal text-gray-900">{name}</h3>
                {isShared && <Users className="w-4 h-4 text-gray-400" />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Обновлён {lastUpdated}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-normal text-gray-900">
                {completedCount} / {itemsCount}
              </p>
              <p className="text-xs text-gray-500">товаров выполнено</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20">
                <div className="w-full bg-gray-200 h-1">
                  <div
                    className="bg-gray-700 h-1 transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {completionPercentage}%
                </p>
              </div>

              <button
                className="p-1 hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Открыть меню действий
                }}
              >
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
