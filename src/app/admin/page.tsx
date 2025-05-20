"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">炉石现开管理后台</h1>
        <Link
          href="/"
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
        >
          返回首页
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/update-cards" className="group block">
          <div className="rounded-lg bg-white p-6 shadow transition-all group-hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">卡牌数据更新</h2>
            <p className="text-gray-600">更新炉石传说的卡牌数据，包括新版本的卡牌和扩展包</p>
          </div>
        </Link>

        <Link href="/admin/contest" className="group block">
          <div className="rounded-lg bg-white p-6 shadow transition-all group-hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">比赛管理</h2>
            <p className="text-gray-600">管理炉石现开比赛的信息，添加、编辑和删除比赛</p>
          </div>
        </Link>

        {/* 可以根据需要添加更多管理功能入口 */}
        <div className="rounded-lg bg-white p-6 shadow opacity-50">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-400">更多功能</h2>
          <p className="text-gray-400">即将推出更多管理功能...</p>
        </div>
      </div>
    </div>
  );
} 