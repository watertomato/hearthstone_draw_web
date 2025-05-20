"use client";

import { useState } from "react";
import Link from "next/link";

// 比赛信息接口定义
interface Contest {
  id: string;
  name: string;
  date: string; // 日期格式如 "2023-10-20"
  startTime: string; // 时间格式如 "14:00"
  location: string; // 比赛地点
  packs: { // 卡包信息
    name: string;  // 扩展包名称
    count: number; // 卡包数量
  }[];
  registrationLink?: string; // 可选的报名链接
  status: "upcoming" | "ongoing" | "completed"; // 比赛状态
  description?: string; // 可选的简要描述
}

// 模拟比赛数据
const MOCK_CONTESTS: Contest[] = [
  {
    id: "contest-001",
    name: "炉石现开挑战赛",
    date: "2023-10-20",
    startTime: "14:00",
    location: "北京火星游戏厅",
    packs: [
      { name: "漫游翡翠梦境", count: 4 },
      { name: "深暗领域", count: 2 }
    ],
    registrationLink: "https://example.com/register/contest-001",
    status: "upcoming",
    description: "首届炉石现开挑战赛，欢迎各位炉石玩家参与。比赛采用6包现开赛制，全程直播。"
  },
  {
    id: "contest-002",
    name: "炉石传说夏季现开赛",
    date: "2023-11-15",
    startTime: "10:00",
    location: "上海电竞文化中心",
    packs: [
      { name: "深暗领域", count: 3 },
      { name: "胜地历险记", count: 3 }
    ],
    registrationLink: "https://example.com/register/contest-002",
    status: "upcoming",
    description: "炉石传说官方夏季现开赛，为期两天。前16名选手将获得丰厚奖金。"
  },
  {
    id: "contest-003",
    name: "暴风城现开邀请赛",
    date: "2023-09-10",
    startTime: "13:00",
    location: "广州游戏体验中心",
    packs: [
      { name: "漫游翡翠梦境", count: 3 },
      { name: "诡异幻元", count: 3 }
    ],
    status: "completed",
    description: "由暴风城电竞队主办的邀请赛，16位知名选手将进行现开对战。"
  },
  {
    id: "contest-004",
    name: "炉石现开青年杯",
    date: "2023-12-05",
    startTime: "15:30",
    location: "成都玩家厅",
    packs: [
      { name: "深暗领域", count: 2 },
      { name: "漫游翡翠梦境", count: 2 },
      { name: "胜地历险记", count: 2 }
    ],
    registrationLink: "https://example.com/register/contest-004",
    status: "upcoming",
    description: "面向全国18-25岁炉石爱好者的现开赛事，采用瑞士赛制。"
  },
  {
    id: "contest-005",
    name: "隆冬现开大师赛",
    date: "2024-01-10",
    startTime: "09:00",
    location: "西安电竞中心",
    packs: [
      { name: "永恒频道卡包", count: 6 }
    ],
    registrationLink: "https://example.com/register/contest-005",
    status: "upcoming",
    description: "专为一线炉石玩家打造的高水平现开赛事，冬季精彩对决。"
  }
];

export default function ContestPage() {
  // 使用状态过滤当前显示的比赛
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // 根据筛选条件过滤比赛
  const filteredContests = statusFilter === "all"
    ? MOCK_CONTESTS
    : MOCK_CONTESTS.filter(contest => contest.status === statusFilter);

  // 获取比赛状态标签的样式
  const getStatusBadgeStyle = (status: string) => {
    switch(status) {
      case "upcoming":
        return "bg-blue-500 text-white";
      case "ongoing":
        return "bg-green-500 text-white";
      case "completed":
        return "bg-gray-500 text-white";
      default:
        return "bg-purple-500 text-white";
    }
  };
  
  // 获取比赛状态的中文名称
  const getStatusName = (status: string) => {
    switch(status) {
      case "upcoming":
        return "即将开始";
      case "ongoing":
        return "进行中";
      case "completed":
        return "已结束";
      default:
        return status;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center px-4 py-16">
        <h1 className="mb-8 text-4xl font-bold">炉石现开比赛信息</h1>
        
        {/* 状态筛选器 */}
        <div className="mb-8 flex space-x-2">
          <button
            className={`rounded-lg px-4 py-2 ${statusFilter === "all" ? "bg-purple-600" : "bg-white/10"}`}
            onClick={() => setStatusFilter("all")}
          >
            全部比赛
          </button>
          <button
            className={`rounded-lg px-4 py-2 ${statusFilter === "upcoming" ? "bg-purple-600" : "bg-white/10"}`}
            onClick={() => setStatusFilter("upcoming")}
          >
            即将开始
          </button>
          <button
            className={`rounded-lg px-4 py-2 ${statusFilter === "ongoing" ? "bg-purple-600" : "bg-white/10"}`}
            onClick={() => setStatusFilter("ongoing")}
          >
            进行中
          </button>
          <button
            className={`rounded-lg px-4 py-2 ${statusFilter === "completed" ? "bg-purple-600" : "bg-white/10"}`}
            onClick={() => setStatusFilter("completed")}
          >
            已结束
          </button>
        </div>
        
        {/* 比赛列表 */}
        <div className="w-full max-w-4xl space-y-6">
          {filteredContests.length > 0 ? (
            filteredContests.map((contest) => (
              <div key={contest.id} className="rounded-xl bg-white/10 p-6 shadow-xl transition-all hover:bg-white/15">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-200">{contest.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="flex items-center text-sm text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {contest.date} {contest.startTime}
                      </span>
                      <span className="flex items-center text-sm text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {contest.location}
                      </span>
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeStyle(contest.status)}`}>
                        {getStatusName(contest.status)}
                      </span>
                    </div>
                  </div>
                  {contest.registrationLink && contest.status === "upcoming" && (
                    <a
                      href={contest.registrationLink}
                      className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 text-center text-white hover:bg-purple-500 sm:mt-0"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      立即报名
                    </a>
                  )}
                </div>
                
                {/* 卡包信息 */}
                <div className="mt-4 rounded-lg bg-black/20 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-purple-300">比赛卡包</h3>
                  <div className="flex flex-wrap gap-2">
                    {contest.packs.map((pack, index) => (
                      <div key={index} className="flex items-center rounded-full bg-purple-900/50 px-3 py-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="font-medium">{pack.name}</span>
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-700 text-xs font-bold">{pack.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 比赛描述 */}
                {contest.description && (
                  <div className="mt-4 text-sm text-gray-300">
                    <p>{contest.description}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-white/10 p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold">未找到符合条件的比赛</h3>
              <p className="mt-2 text-gray-400">请尝试其他筛选条件查找比赛信息</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 