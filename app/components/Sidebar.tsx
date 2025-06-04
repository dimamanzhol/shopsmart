"use client";

import { Home, List, Share2, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { icon: Home, label: "Главная", href: "/" },
  { icon: List, label: "Списки", href: "/lists" },
  { icon: Share2, label: "Общий доступ", href: "/share" },
  { icon: Settings, label: "Настройки", href: "/settings" },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="w-60 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="px-6 py-4 border-b border-gray-200">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-6 h-6 bg-gray-900 flex items-center justify-center">
            <List className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-medium text-gray-900">ShopSmart</h1>
        </Link>
      </div>

      <nav className="flex-1 py-3">
        <ul>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-6 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white font-normal"
                      : "text-gray-700 hover:bg-gray-100 font-normal"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-600 flex items-center justify-center text-xs font-normal text-white">
            У
          </div>
          <div>
            <p className="text-sm font-normal text-gray-900">Пользователь</p>
            <p className="text-xs text-gray-500">Гость</p>
          </div>
        </div>
      </div>
    </div>
  );
};
