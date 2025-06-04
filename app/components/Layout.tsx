"use client";

import { ReactNode } from "react";
import Navigation from "./Navigation";
import UserButton from "./UserButton";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header with Navigation and User Button */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-semibold text-gray-900">ShopSmart</h1>
            <Navigation />
          </div>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
};

export default Layout;
