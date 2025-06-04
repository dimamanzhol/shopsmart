"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Plus, Settings, Users, Home } from "lucide-react";

const Navigation = () => {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Главная",
      href: "/",
      icon: Home,
      current: pathname === "/",
    },
    {
      name: "Создать список",
      href: "/create",
      icon: Plus,
      current: pathname === "/create",
    },
  ];

  return (
    <nav className="flex items-center gap-6">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              item.current
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:block">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default Navigation;
