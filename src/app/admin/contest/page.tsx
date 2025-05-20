"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 比赛信息接口定义，与数据库模型保持一致
interface Pack {
  id?: string;
  name: string;
  count: number;
  contestId?: string;
}

interface Contest {
  id: string;
  name: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed";
  maxParticipants: number;
  currentParticipants: number;
  registrationLink?: string;
  description?: string;
  packs: Pack[];
  createdAt?: string;
  updatedAt?: string;
}

// 创建或编辑比赛时使用的表单接口
interface ContestFormData {
  id?: string;
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed";
  maxParticipants: number;
  currentParticipants: number;
  registrationLink?: string;
  description?: string;
  packs: {
    name: string;
    count: number;
  }[];
}

// 模拟比赛数据，后续可替换为API请求
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
  }
];

export default function ContestAdminPage() {
  // 比赛列表状态
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 当前选中编辑的比赛
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  // 是否显示编辑对话框
  const [showEditModal, setShowEditModal] = useState(false);
  // 编辑表单状态
  const [formData, setFormData] = useState<ContestFormData>({
    name: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    maxParticipants: 30,
    currentParticipants: 0,
    status: "upcoming",
    packs: [{ name: "", count: 1 }],
    description: ""
  });
  
  // 扩展包列表
  const packOptions = [
    "漫游翡翠梦境",
    "深暗领域",
    "胜地历险记",
    "诡异幻元",
    "威兹班的工坊",
    "纳斯利亚堡的悬案",
    "决战荒芜之地",
    "永恒频道卡包"
  ];

  // u52a0u8f7du6bd4u8d5bu6570u636e
  const fetchContests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/contest');
      if (!response.ok) {
        throw new Error(`u8bf7u6c42u5931u8d25: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setContests(data.data.contests);
      } else {
        throw new Error(data.message || 'u83b7u53d6u6bd4u8d5bu5217u8868u5931u8d25');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'u52a0u8f7du6bd4u8d5bu6570u636eu65f6u51fau9519');
      console.error('u52a0u8f7du6bd4u8d5bu6570u636eu65f6u51fau9519:', err);
    } finally {
      setLoading(false);
    }
  };

  // u9875u9762u52a0u8f7du65f6u83b7u53d6u6570u636e
  useEffect(() => {
    fetchContests();
  }, []);

  // u6253u5f00u7f16u8f91u5bf9u8bddu6846
  const openEditModal = (contest?: Contest) => {
    if (contest) {
      // u7f16u8f91u73b0u6709u6bd4u8d5b - u9700u8981u5c06u65e5u671fu65f6u95f4u8f6cu6362u4e3au8868u5355u683cu5f0f
      setCurrentContest(contest);
      const startDate = new Date(contest.startDateTime);
      const endDate = new Date(contest.endDateTime);

      setFormData({
        id: contest.id,
        name: contest.name,
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toISOString().split('T')[1].substring(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toISOString().split('T')[1].substring(0, 5),
        location: contest.location,
        status: contest.status,
        maxParticipants: contest.maxParticipants,
        currentParticipants: contest.currentParticipants,
        registrationLink: contest.registrationLink,
        description: contest.description,
        // u9700u8981u6df1u62f7u8d1du6570u7ec4u5bf9u8c61
        packs: [...contest.packs.map(pack => ({ name: pack.name, count: pack.count }))]
      });
    } else {
      // u521bu5efau65b0u6bd4u8d5b
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setCurrentContest(null);
      setFormData({
        name: "",
        startDate: now.toISOString().split('T')[0],
        startTime: "10:00",
        endDate: tomorrow.toISOString().split('T')[0],
        endTime: "18:00",
        location: "",
        status: "upcoming",
        maxParticipants: 30,
        currentParticipants: 0,
        registrationLink: "",
        description: "",
        packs: [{ name: "", count: 1 }]
      });
    }
    setShowEditModal(true);
  };

  // u5173u95edu7f16u8f91u5bf9u8bddu6846
  const closeEditModal = () => {
    setShowEditModal(false);
    setCurrentContest(null);
  };

  // u5904u7406u8868u5355u5b57u6bb5u53d8u5316
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // u5904u7406u5361u5305u53d8u5316
  const handlePackChange = (index: number, field: 'name' | 'count', value: string | number) => {
    setFormData(prev => {
      const newPacks = [...prev.packs];
      newPacks[index] = {
        ...newPacks[index],
        [field]: value
      };
      return {
        ...prev,
        packs: newPacks
      };
    });
  };

  // u6dfbu52a0u5361u5305
  const addPack = () => {
    setFormData(prev => ({
      ...prev,
      packs: [...prev.packs, { name: "", count: 1 }]
    }));
  };

  // u79fbu9664u5361u5305
  const removePack = (index: number) => {
    setFormData(prev => {
      const newPacks = [...prev.packs];
      newPacks.splice(index, 1);
      return {
        ...prev,
        packs: newPacks.length ? newPacks : [{ name: "", count: 1 }]
      };
    });
  };

  // u4fddu5b58u6bd4u8d5b
  const saveContest = async () => {
    // u8868u5355u9a8cu8bc1
    if (!formData.name || !formData.startDate || !formData.startTime || 
        !formData.endDate || !formData.endTime || !formData.location) {
      alert("u8bf7u586bu5199u6240u6709u5fc5u586bu5b57u6bb5");
      return;
    }

    // u9a8cu8bc1u5361u5305u4fe1u606f
    if (formData.packs.some(pack => !pack.name || pack.count < 1)) {
      alert("u8bf7u586bu5199u5b8cu6574u7684u5361u5305u4fe1u606f");
      return;
    }

    try {
      // u6784u5efau8bf7u6c42u6570u636e
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);
      
      const payload = {
        ...formData,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        maxParticipants: Number(formData.maxParticipants),
        currentParticipants: Number(formData.currentParticipants || 0),
      };
      
      delete (payload as any).startDate;
      delete (payload as any).startTime;
      delete (payload as any).endDate;
      delete (payload as any).endTime;
      
      // u53d1u9001u8bf7u6c42
      const url = '/api/admin/contest';
      const method = currentContest ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`u8bf7u6c42u5931u8d25: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(currentContest ? 'u6bd4u8d5bu66f4u65b0u6210u529f' : 'u6bd4u8d5bu521bu5efau6210u529f');
        fetchContests(); // u91cdu65b0u52a0u8f7du6bd4u8d5bu6570u636e
        closeEditModal();
      } else {
        throw new Error(result.message || 'u64cdu4f5cu5931u8d25');
      }
    } catch (err) {
      console.error('u4fddu5b58u6bd4u8d5bu5931u8d25:', err);
      alert(`u4fddu5b58u5931u8d25: ${err instanceof Error ? err.message : 'u672au77e5u9519u8bef'}`);
    }
  };

  // u5220u9664u6bd4u8d5b
  const deleteContest = async (id: string) => {
    if (confirm("u786eu8ba4u8981u5220u9664u8fd9u4e2au6bd4u8d5bu5417uff1fu6b64u64cdu4f5cu4e0du53efu64a4u9500u3002")) {
      try {
        const response = await fetch(`/api/admin/contest?id=${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`u8bf7u6c42u5931u8d25: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          alert('u6bd4u8d5bu5df2u6210u529fu5220u9664');
          fetchContests(); // u91cdu65b0u52a0u8f7du6bd4u8d5bu6570u636e
        } else {
          throw new Error(result.message || 'u5220u9664u5931u8d25');
        }
      } catch (err) {
        console.error('u5220u9664u6bd4u8d5bu5931u8d25:', err);
        alert(`u5220u9664u5931u8d25: ${err instanceof Error ? err.message : 'u672au77e5u9519u8bef'}`);
      }
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

  // 获取状态标签的颜色
  const getStatusColor = (status: string) => {
    switch(status) {
      case "upcoming":
        return "text-blue-600 bg-blue-100 border-blue-600";
      case "ongoing":
        return "text-green-600 bg-green-100 border-green-600";
      case "completed":
        return "text-gray-600 bg-gray-100 border-gray-600";
      default:
        return "text-purple-600 bg-purple-100 border-purple-600";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">炉石现开比赛管理</h1>
        <div className="flex space-x-4">
          <Link
            href="/"
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            返回首页
          </Link>
          <Link
            href="/contest"
            className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            查看比赛页面
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex justify-between">
          <h2 className="mb-4 text-xl font-semibold">比赛列表</h2>
          <button 
            onClick={() => openEditModal()} 
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            添加新比赛
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">比赛名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">日期时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">地点</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">卡包信息</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {contests.map((contest) => (
                <tr key={contest.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{contest.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{contest.date} {contest.startTime}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{contest.location}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(contest.status)}`}>
                      {getStatusName(contest.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {contest.packs.map((pack, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                          {pack.name} ({pack.count})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(contest)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteContest(contest.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑对话框 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {currentContest ? "编辑比赛" : "添加新比赛"}
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">比赛名称 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">状态 *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="upcoming">即将开始</option>
                  <option value="ongoing">进行中</option>
                  <option value="completed">已结束</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">日期 *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">时间 *</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">地点 *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">报名链接</label>
                <input
                  type="url"
                  name="registrationLink"
                  value={formData.registrationLink || ''}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://example.com/register"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">比赛描述</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleFormChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">卡包信息 *</label>
                  <button
                    type="button"
                    onClick={addPack}
                    className="rounded-md bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                  >
                    添加卡包
                  </button>
                </div>
                
                {formData.packs.map((pack, index) => (
                  <div key={index} className="mb-2 flex items-center gap-2">
                    <select
                      value={pack.name}
                      onChange={(e) => handlePackChange(index, 'name', e.target.value)}
                      className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">选择扩展包</option>
                      {packOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="flex w-24 items-center">
                      <input
                        type="number"
                        min="1"
                        value={pack.count}
                        onChange={(e) => handlePackChange(index, 'count', parseInt(e.target.value) || 1)}
                        className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="ml-1">包</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePack(index)}
                      className="rounded-md bg-red-100 p-2 text-red-600 hover:bg-red-200"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={saveContest}
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 