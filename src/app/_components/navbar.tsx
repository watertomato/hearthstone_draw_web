"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  // 判断当前路径是否激活
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="fixed left-0 top-0 z-50 w-full bg-purple-900/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-white">
          炉石传说现开工具平台
        </Link>
        <div className="flex gap-4">
          <Link
            href="/"
            className={`rounded-lg px-4 py-2 transition-colors ${
              isActive("/")
                ? "bg-white/20 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            首页
          </Link>
          <Link
            href="/draw"
            className={`rounded-lg px-4 py-2 transition-colors ${
              isActive("/draw")
                ? "bg-white/20 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            抽卡模拟
          </Link>
          <Link
            href="/deck"
            className={`rounded-lg px-4 py-2 transition-colors ${
              isActive("/deck")
                ? "bg-white/20 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            卡组构建
          </Link>
          <Link
            href="/contest"
            className={`rounded-lg px-4 py-2 transition-colors ${
              isActive("/contest")
                ? "bg-white/20 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            比赛信息
          </Link>
        </div>
      </div>
    </nav>
  );
} 