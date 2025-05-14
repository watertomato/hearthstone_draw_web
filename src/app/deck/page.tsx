"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// 卡牌接口定义
interface Card {
  id: string;
  name: string;
  cardClass: string;
  cardSet: string;
  rarity: string;
  cost: number;
  attack?: number;
  health?: number;
  text?: string;
  cardType?: string;
  mechanics?: string;
  race?: string;
  races?: string;
  spellSchool?: string;
}

export default function DeckPage() {
  // 导入的卡牌ID列表
  const [importedCardIds, setImportedCardIds] = useState<string[]>([]);
  // 卡牌数据映射
  const [cardData, setCardData] = useState<Record<string, Card>>({});
  // 是否正在导入
  const [isImporting, setIsImporting] = useState(false);
  // 导入状态信息
  const [importMessage, setImportMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  // 是否正在加载卡牌数据
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 搜索关键词
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // 检查导入的数据结构是否合法
        if (!data.cardIds || !Array.isArray(data.cardIds)) {
          throw new Error("文件格式不正确，找不到卡牌ID列表");
        }
        
        setImportedCardIds(data.cardIds);
        setImportMessage({
          type: 'success',
          text: `成功导入 ${data.cardIds.length} 张卡牌`
        });
        
        // 导入成功后加载卡牌数据
        fetchCardData(data.cardIds);
      } catch (error) {
        console.error("导入卡牌数据失败:", error);
        setImportMessage({
          type: 'error',
          text: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      } finally {
        setIsImporting(false);
        // 重置文件输入
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      setImportMessage({
        type: 'error',
        text: '读取文件时出错'
      });
      setIsImporting(false);
    };
    
    reader.readAsText(file);
  };

  // 从API获取卡牌数据
  const fetchCardData = async (cardIds: string[]) => {
    if (cardIds.length === 0) return;
    
    setIsLoadingCards(true);
    
    try {
      // 每次最多查询100张卡牌
      const batchSize = 100;
      let allCards: Record<string, Card> = {};
      
      // 批量查询卡牌数据
      for (let i = 0; i < cardIds.length; i += batchSize) {
        const batch = cardIds.slice(i, i + batchSize);
        const response = await fetch(`/api/cards/batch?ids=${batch.join(',')}`);
        
        if (!response.ok) {
          throw new Error(`获取卡牌数据失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || '获取卡牌数据失败');
        }
        
        // 合并卡牌数据
        allCards = { ...allCards, ...result.data.cardMap };
      }
      
      setCardData(allCards);
    } catch (error) {
      console.error("获取卡牌数据失败:", error);
      setImportMessage({
        type: 'error',
        text: `获取卡牌数据失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsLoadingCards(false);
    }
  };

  // 触发文件选择对话框
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 通过ID获取卡牌信息
  const getCardById = (cardId: string): Card | null => {
    return cardData[cardId] || null;
  };

  // 获取卡牌类型的中文名称
  const getCardTypeName = (cardType?: string): string => {
    if (!cardType) return "未知";
    
    switch (cardType.toUpperCase()) {
      case 'MINION': return "随从";
      case 'SPELL': return "法术";
      case 'WEAPON': return "武器";
      case 'HERO': return "英雄";
      case 'LOCATION': return "地标";
      default: return cardType;
    }
  };

  // 获取卡牌额外信息
  const getCardExtraInfo = (card: Card): string => {
    // 对于随从，显示种族
    if (card.cardType?.toUpperCase() === 'MINION') {
      const races = card.races ? JSON.parse(card.races) : [];
      return races.length > 0 ? races.join(', ') : "";
    }
    
    // 对于法术，显示法术学派
    if (card.cardType?.toUpperCase() === 'SPELL' && card.spellSchool) {
      return card.spellSchool;
    }
    
    return "";
  };

  // 格式化卡牌描述文本
  const formatCardText = (text?: string): string => {
    if (!text) return "";
    
    // 移除HTML标签和美元符号
    return text.replace(/<[^>]*>/g, '').replace(/\$/g, '');
  };

  // 获取扩展包本地化名称
  const getSetLocalizedName = (setId: string): string => {
    // 这里应该有一个扩展包ID到中文名称的映射表
    // 简单示例，实际项目中应该有完整的映射
    const setNameMap: Record<string, string> = {
      'EMERALD_DREAM': '漫游翡翠梦境',
      'SPACE': '深暗领域',
      'ISLAND_VACATION': '胜地历险记',
      'WHIZBANGS_WORKSHOP': '威兹班的工坊',
      'TITANS': '泰坦诸神',
      // ... 更多映射
    };
    
    return setNameMap[setId] || setId;
  };

  // 统计卡牌数量
  const countCards = (cardIds: string[]): Record<string, number> => {
    return cardIds.reduce((counts, cardId) => {
      counts[cardId] = (counts[cardId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  };

  // 获取稀有度样式
  const getRarityStyle = (rarity: string | undefined) => {
    if (!rarity) return "border-gray-400";
    
    switch (rarity.toUpperCase()) {
      case 'LEGENDARY': return "border-yellow-400 bg-yellow-900/20";
      case 'EPIC': return "border-purple-400 bg-purple-900/20";
      case 'RARE': return "border-blue-400 bg-blue-900/20";
      default: return "border-gray-400 bg-gray-900/20";
    }
  };
  
  // 搜索卡牌
  const searchCards = (cards: { id: string; count: number; card: Card | null }[], term: string): { id: string; count: number; card: Card | null }[] => {
    if (!term.trim()) return cards;
    
    const lowerCaseTerm = term.toLowerCase();
    
    return cards.filter(({ card }) => {
      if (!card) return false;
      
      // 搜索名称
      if (card.name.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索职业
      if (card.cardClass.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索扩展包
      const setName = getSetLocalizedName(card.cardSet);
      if (setName.toLowerCase().includes(lowerCaseTerm) || card.cardSet.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索卡牌类型
      const cardTypeName = getCardTypeName(card.cardType);
      if (cardTypeName.toLowerCase().includes(lowerCaseTerm) || (card.cardType && card.cardType.toLowerCase().includes(lowerCaseTerm))) return true;
      
      // 搜索描述文本
      if (card.text && formatCardText(card.text).toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索种族/法术类型
      const extraInfo = getCardExtraInfo(card);
      if (extraInfo.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索种族（原始数据）
      try {
        if (card.races) {
          const races = JSON.parse(card.races);
          if (races.some((race: string) => race.toLowerCase().includes(lowerCaseTerm))) return true;
        }
        
        // 搜索机制（原始数据）
        if (card.mechanics) {
          const mechanics = JSON.parse(card.mechanics);
          if (mechanics.some((mechanic: string) => mechanic.toLowerCase().includes(lowerCaseTerm))) return true;
        }
      } catch (error) {
        // 忽略解析错误
      }
      
      return false;
    });
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 准备显示的卡牌数据
  const prepareCardsForDisplay = () => {
    if (importedCardIds.length === 0) return [];
    
    // 统计每张卡牌的数量
    const cardCounts = countCards(importedCardIds);
    
    // 获取唯一的卡牌ID
    const uniqueCardIds = [...new Set(importedCardIds)];
    
    // 按照费用排序卡牌
    return uniqueCardIds.sort((a, b) => {
      const cardA = getCardById(a);
      const cardB = getCardById(b);
      
      // 如果卡牌数据还没有加载完成
      if (!cardA || !cardB) return 0;
      
      // 首先按费用排序
      if (cardA.cost !== cardB.cost) {
        return cardA.cost - cardB.cost;
      }
      
      // 然后按名称排序
      return cardA.name.localeCompare(cardB.name);
    }).map(cardId => ({
      id: cardId,
      count: cardCounts[cardId] || 0, // 确保count有默认值
      card: getCardById(cardId)
    }));
  };

  // 获取所有卡牌并应用搜索过滤
  const allCards = prepareCardsForDisplay();
  const filteredCards = searchCards(allCards, searchTerm);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center px-4 py-16">
        <h1 className="mb-8 text-4xl font-bold">卡组构建器</h1>
        
        {/* 自定义滚动条样式 */}
        <style jsx global>{`
          /* 滚动条整体样式 */
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          /* 滚动条滑块 */
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(147, 51, 234, 0.5);
            border-radius: 10px;
          }
          
          /* 滚动条滑块hover效果 */
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(147, 51, 234, 0.8);
          }
          
          /* 滚动条轨道 */
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 10px;
          }
          
          /* 隐藏滚动条但保留功能 */
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>
        
        <div className="w-full max-w-6xl">
          {/* 顶部面板 - 职业选择和过滤器 */}
          <div className="mb-6 rounded-xl bg-white/10 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:gap-8">
              <div className="mb-6 md:mb-0 md:w-1/2">
                <h2 className="mb-4 text-2xl font-bold">职业选择</h2>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  <button className="rounded-lg bg-gray-700 p-2 text-sm hover:bg-gray-600">
                    全部
                  </button>
                  <button className="rounded-lg bg-blue-700 p-2 text-sm hover:bg-blue-600">
                    法师
                  </button>
                  <button className="rounded-lg bg-green-700 p-2 text-sm hover:bg-green-600">
                    猎人
                  </button>
                  <button className="rounded-lg bg-yellow-700 p-2 text-sm hover:bg-yellow-600">
                    圣骑士
                  </button>
                  <button className="rounded-lg bg-black p-2 text-sm hover:bg-gray-800">
                    术士
                  </button>
                  <button className="rounded-lg bg-red-700 p-2 text-sm hover:bg-red-600">
                    战士
                  </button>
                  <button className="rounded-lg bg-white p-2 text-black text-sm hover:bg-gray-200">
                    牧师
                  </button>
                  <button className="rounded-lg bg-orange-700 p-2 text-sm hover:bg-orange-600">
                    德鲁伊
                  </button>
                  <button className="rounded-lg bg-purple-700 p-2 text-sm hover:bg-purple-600">
                    恶魔猎手
                  </button>
                  <button className="rounded-lg bg-teal-700 p-2 text-sm hover:bg-teal-600">
                    萨满
                  </button>
                  <button className="rounded-lg bg-pink-700 p-2 text-sm hover:bg-pink-600">
                    潜行者
                  </button>
                  <button className="rounded-lg bg-cyan-800 p-2 text-sm hover:bg-cyan-700">
                    死亡骑士
                  </button>
                </div>
              </div>

              <div className="md:w-1/2">
                <h2 className="mb-4 text-2xl font-bold">卡牌筛选</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm">费用</label>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {[1, 2, 3, 4, 5, 6, 7, "8+"].map((cost) => (
                        <button 
                          key={cost} 
                          className="rounded bg-white/20 p-2 text-sm hover:bg-white/30"
                        >
                          {cost}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm">稀有度</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button className="rounded bg-white/20 p-2 text-sm hover:bg-white/30">
                        普通
                      </button>
                      <button className="rounded bg-white/20 p-2 text-sm hover:bg-white/30">
                        稀有
                      </button>
                      <button className="rounded bg-white/20 p-2 text-sm hover:bg-white/30">
                        史诗
                      </button>
                      <button className="rounded bg-white/20 p-2 text-sm hover:bg-white/30">
                        传说
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 下方卡牌区域 - 使用grid布局 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 可用卡牌区域 - 占据2/3宽度 */}
            <div className="rounded-xl bg-white/10 p-6 shadow-xl lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">可用卡牌</h2>
                <button 
                  className={`px-3 py-1 rounded text-sm ${
                    isImporting 
                      ? "bg-gray-600 cursor-not-allowed" 
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                  onClick={triggerFileInput}
                  disabled={isImporting}
                >
                  {isImporting ? "导入中..." : "导入卡牌数据"}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".json" 
                  onChange={handleFileSelect}
                />
              </div>
              
              {importMessage && importMessage.type === 'error' && (
                <div className="mb-4 p-2 rounded text-sm bg-red-900/50 text-red-200">
                  {importMessage.text}
                </div>
              )}
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="搜索卡牌..."
                  className="w-full rounded-lg bg-white/5 p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              
              <div className="custom-scrollbar h-[500px] overflow-y-auto rounded-lg bg-white/5 p-2">
                {isLoadingCards ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
                      <p className="text-gray-300">正在加载卡牌数据...</p>
                    </div>
                  </div>
                ) : importedCardIds.length > 0 ? (
                  <div className="space-y-2">
                    {searchTerm && (
                      <div className="bg-purple-900/30 rounded p-2 mb-2 text-xs">
                        找到 <span className="font-semibold">{filteredCards.length}</span> 张符合条件的卡牌
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {filteredCards.map(({ id, count, card }) => (
                        <div 
                          key={id} 
                          className={`rounded p-2 text-xs border ${card ? getRarityStyle(card.rarity) : 'border-gray-500 bg-white/5'}`}
                        >
                          {card ? (
                            <div className="flex flex-col">
                              {/* 卡牌标题行：费用、名称、职业和数量 */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center">
                                  <span className="bg-amber-800 text-white rounded-lg px-1.5 py-0.5 mr-1.5 text-center min-w-[1.25rem] text-xs">
                                    {card.cost !== undefined ? card.cost : '?'}
                                  </span>
                                  <span className="font-medium text-yellow-200 truncate max-w-[120px]" title={card.name}>
                                    {card.name}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className="bg-gray-800 text-gray-300 rounded px-1 py-0.5 text-[10px] mr-1">
                                    {card.cardClass}
                                  </span>
                                  <span className="bg-purple-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                                    {count}
                                  </span>
                                </div>
                              </div>
                              
                              {/* 卡牌详细信息行 */}
                              <div className="flex flex-wrap gap-1 mb-1 text-[10px]">
                                <span className="bg-blue-900/30 text-blue-200 rounded px-1 py-0.5">
                                  {getSetLocalizedName(card.cardSet)}
                                </span>
                                <span className="bg-green-900/30 text-green-200 rounded px-1 py-0.5">
                                  {getCardTypeName(card.cardType)}
                                </span>
                                
                                {/* 攻击/生命值（如果是随从） */}
                                {card.cardType?.toUpperCase() === 'MINION' && (
                                  <span className="bg-red-900/30 text-red-200 rounded px-1 py-0.5">
                                    {card.attack || 0}/{card.health || 0}
                                  </span>
                                )}
                                
                                {/* 种族或法术类型 */}
                                {getCardExtraInfo(card) && (
                                  <span className="bg-yellow-900/30 text-yellow-200 rounded px-1 py-0.5">
                                    {getCardExtraInfo(card)}
                                  </span>
                                )}
                              </div>
                              
                              {/* 卡牌描述 */}
                              {card.text && (
                                <div className="text-gray-300 text-[10px] bg-black/20 p-1.5 rounded line-clamp-3 min-h-[2.5rem]">
                                  {formatCardText(card.text)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div className="text-gray-400 text-xs">加载中: {id}</div>
                              <span className="bg-purple-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                                {count}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-400">请导入卡牌数据</p>
                )}
              </div>
            </div>

            {/* 右侧面板 - 当前卡组 */}
            <div className="rounded-xl bg-white/10 p-6 shadow-xl lg:col-span-1">
              <h2 className="mb-4 text-2xl font-bold">当前卡组</h2>
              <div className="mb-2 flex justify-between">
                <span>卡牌数量: 0/30</span>
                <button className="rounded bg-red-700 px-2 py-1 text-sm hover:bg-red-600">
                  清空卡组
                </button>
              </div>
              <div className="custom-scrollbar h-[400px] overflow-y-auto rounded-lg bg-white/5 p-4">
                <p className="text-center text-gray-400">卡组是空的</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="rounded-lg bg-indigo-600 py-2 font-bold hover:bg-indigo-500">
                  导入卡组代码
                </button>
                <button className="rounded-lg bg-yellow-600 py-2 font-bold hover:bg-yellow-500">
                  导出卡组代码
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 