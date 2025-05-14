"use client";

import { useState } from "react";
import Link from "next/link";

export default function UpdateCardsPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    cards?: number;
    sets?: number;
    error?: string;
  } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 更新卡牌数据
  const updateCards = async () => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      setResult(null);

      const response = await fetch("/api/cards/update", {
        method: "POST",
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("更新卡牌数据失败:", error);
      setResult({
        success: false,
        error: "更新失败，请查看控制台获取详细错误信息",
      });
    } finally {
      setIsUpdating(false);
      // 更新后自动刷新日志
      fetchLogs();
    }
  };

  // 获取更新日志
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/data/update?limit=10");
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setLogs(data.data);
        }
      }
    } catch (error) {
      console.error("获取更新日志失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件加载时获取日志
  useState(() => {
    fetchLogs();
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">炉石传说卡牌数据更新</h1>
        <Link
          href="/"
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
        >
          返回首页
        </Link>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">更新卡牌数据</h2>
        <p className="mb-4 text-gray-600">
          点击下面的按钮从HearthstoneJSON获取最新的炉石传说卡牌数据。这将更新数据库中的卡牌信息。
        </p>
        <button
          onClick={updateCards}
          disabled={isUpdating}
          className={`rounded-md px-4 py-2 font-medium text-white ${
            isUpdating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {isUpdating ? "更新中..." : "开始更新"}
        </button>

        {result && (
          <div
            className={`mt-4 rounded-md p-4 ${
              result.success
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {result.success ? (
              <div>
                <p className="font-semibold">更新成功！</p>
                <p>{result.message}</p>
                {result.sets && <p>更新了 {result.sets} 个扩展包</p>}
                {result.cards && <p>更新了 {result.cards} 张卡牌</p>}
              </div>
            ) : (
              <div>
                <p className="font-semibold">更新失败</p>
                <p>{result.error || result.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">更新日志</h2>
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-800 hover:bg-gray-300"
          >
            {isLoading ? "加载中..." : "刷新"}
          </button>
        </div>

        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    消息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    卡牌数量
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {log.updateType}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          log.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : log.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.message}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {log.cardCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">暂无更新日志</p>
        )}
      </div>
    </div>
  );
} 