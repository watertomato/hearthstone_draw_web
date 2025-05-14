"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 卡牌相关接口
interface Card {
  id: string;
  name: string;
  rarity: string;
  cardClass: string;
  cardSet: string;
  cost: number;
  attack?: number;
  health?: number;
  text?: string;
  flavor?: string;
  mechanics?: string[];
  races?: string[];
  spellSchool?: string;
  referencedTags?: string[];
  runeCost?: Record<string, number>;
  type?: string;
}

// 单个卡包结果
interface PackResult {
  packId: number;
  cards: Card[];
  rarityDistribution: {
    COMMON: number;
    RARE: number;
    EPIC: number;
    LEGENDARY: number;
  };
}

// 抽卡API返回结果
interface DrawResult {
  setId: string;
  setName: string;
  packsOpened: number;
  totalCards: number;
  packs: PackResult[];
  totalRarityDistribution: {
    COMMON: number;
    RARE: number;
    EPIC: number;
    LEGENDARY: number;
  };
}

// 卡牌详情模态框组件
function CardDetailModal({ card, onClose }: { card: Card | null, onClose: () => void }) {
  if (!card) return null;
  
  // 稀有度对应的样式
  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'border-yellow-400 bg-yellow-900/50';
      case 'EPIC': return 'border-purple-400 bg-purple-900/50';
      case 'RARE': return 'border-blue-400 bg-blue-900/50';
      default: return 'border-gray-400 bg-gray-900/50';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <div className={`max-w-md rounded-lg border-2 ${getRarityStyle(card.rarity)} p-4 shadow-xl`}>
          <div className="flex flex-col">
            <div className="mb-2 flex items-center">
              <h3 className="text-xl font-bold text-yellow-300">{card.name}</h3>
              <div className="ml-2 rounded bg-amber-800 px-2 py-1 text-sm font-bold text-white">
                {card.cost}费
              </div>
            </div>
            
            <div className="mb-1 text-sm text-gray-300">
              <span className="font-semibold">职业:</span> {card.cardClass}
            </div>
            
            {(card.type) && (
              <div className="mb-1 text-sm text-gray-300">
                <span className="font-semibold">类型:</span> {card.type}
                {card.races && card.races.length > 0 && 
                  ` (${card.races.join(', ')})`
                }
              </div>
            )}
            
            {(card.attack !== undefined && card.health !== undefined) && (
              <div className="mb-1 text-sm text-gray-300">
                <span className="font-semibold">攻击/生命:</span> {card.attack}/{card.health}
              </div>
            )}
            
            {card.spellSchool && (
              <div className="mb-1 text-sm text-gray-300">
                <span className="font-semibold">法术学派:</span> {card.spellSchool}
              </div>
            )}
            
            {card.text && (
              <div className="mt-3 rounded bg-black/30 p-3 text-white">
                <div dangerouslySetInnerHTML={{ __html: card.text.replace(/\$/g, '') }} />
              </div>
            )}
            
            {card.flavor && (
              <div className="mt-4 italic text-gray-400">
                "{card.flavor}"
              </div>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="absolute right-2 top-2 rounded-full bg-red-600/80 p-1 text-white hover:bg-red-600"
            style={{ zIndex: 10 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DrawResultPage() {
  const [drawResults, setDrawResults] = useState<DrawResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // 获取稀有度对应的样式
  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'text-yellow-300 bg-yellow-900/30';
      case 'EPIC':
        return 'text-purple-300 bg-purple-900/30';
      case 'RARE':
        return 'text-blue-300 bg-blue-900/30';
      default: // COMMON
        return 'text-gray-300 bg-gray-900/30';
    }
  };

  // 从本地存储加载抽卡结果
  useEffect(() => {
    try {
      setLoading(true);
      const storedResults = localStorage.getItem('hearthstone_draw_results');
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        setDrawResults(parsedResults);
      } else {
        setError('未找到抽卡结果数据');
      }
    } catch (err) {
      console.error('加载抽卡结果失败:', err);
      setError('加载抽卡结果失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取扩展包名称
  const getSetName = (setId: string): string => {
    // 扩展包英文名称到中文的映射表
    const SET_NAME_TRANSLATIONS: Record<string, string> = {
      'EMERALD_DREAM': '漫游翡翠梦境',
      'SPACE': '深暗领域',
      'TITANS': '泰坦诸神',
      'BATTLE_OF_THE_BANDS': '传奇音乐节',
      'CORE': '核心',
      'TGT': '冠军的试炼',
      'GVG': '地精大战侏儒',
      // 其他可以根据需要添加
    };
    
    return SET_NAME_TRANSLATIONS[setId] || setId;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center px-4 py-16">
          <div className="flex flex-col items-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
            <p className="text-xl text-gray-300">正在加载抽卡结果...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !drawResults) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center px-4 py-16">
          <div className="rounded-lg bg-red-900/30 p-6 max-w-xl text-center">
            <h1 className="text-2xl font-bold mb-4">加载失败</h1>
            <p className="text-lg text-red-200 mb-6">{error || '无法加载抽卡结果'}</p>
            <Link href="/draw" className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-500">
              返回抽卡页面
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">抽卡详细结果</h1>
            <Link href="/draw" className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-500">
              返回抽卡页面
            </Link>
          </div>
          
          {/* 总体统计 */}
          <div className="rounded-lg bg-white/10 p-4 mb-8">
            <h2 className="text-xl font-semibold mb-3">总体统计</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div key="total-packs" className="rounded bg-purple-900/30 p-2 text-center">
                <div className="text-2xl font-bold text-white">{drawResults.packsOpened}</div>
                <div className="text-xs text-gray-300">总开包数</div>
              </div>
              <div key="total-legendary" className="rounded bg-purple-900/30 p-2 text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  {drawResults.totalRarityDistribution.LEGENDARY || 0}
                </div>
                <div className="text-xs text-gray-300">传说卡</div>
              </div>
              <div key="total-epic" className="rounded bg-purple-900/30 p-2 text-center">
                <div className="text-2xl font-bold text-purple-300">
                  {drawResults.totalRarityDistribution.EPIC || 0}
                </div>
                <div className="text-xs text-gray-300">史诗卡</div>
              </div>
              <div key="total-rare" className="rounded bg-purple-900/30 p-2 text-center">
                <div className="text-2xl font-bold text-blue-300">
                  {drawResults.totalRarityDistribution.RARE || 0}
                </div>
                <div className="text-xs text-gray-300">稀有卡</div>
              </div>
            </div>
          </div>
          
          {/* 按包查看 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">抽卡详情（{drawResults.packs.length}包）</h2>
            
            <div className="space-y-6">
              {drawResults.packs.map((pack, packIndex) => {
                // 对卡牌按稀有度排序
                const sortedCards = [...pack.cards].sort((a, b) => {
                  const rarityOrder = { 'LEGENDARY': 1, 'EPIC': 2, 'RARE': 3, 'COMMON': 4 };
                  return (rarityOrder[a.rarity as keyof typeof rarityOrder] || 4) - 
                         (rarityOrder[b.rarity as keyof typeof rarityOrder] || 4);
                });
                
                // 确定此包来自哪个扩展包
                const setId = sortedCards[0]?.cardSet || '';
                const setName = getSetName(setId);
                
                return (
                  <div key={`pack-${packIndex}-${pack.packId}`} className="rounded-lg bg-white/5 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">
                        卡包 #{pack.packId} - {setName}
                      </h3>
                      <div className="flex space-x-2">
                        <span key="legendary" className="text-xs px-2 py-1 rounded bg-yellow-900/20 text-yellow-300">
                          传说: {pack.rarityDistribution.LEGENDARY || 0}
                        </span>
                        <span key="epic" className="text-xs px-2 py-1 rounded bg-purple-900/20 text-purple-300">
                          史诗: {pack.rarityDistribution.EPIC || 0}
                        </span>
                        <span key="rare" className="text-xs px-2 py-1 rounded bg-blue-900/20 text-blue-300">
                          稀有: {pack.rarityDistribution.RARE || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      {sortedCards.map((card, idx) => (
                        <div 
                          key={`${pack.packId}-${card.id}-${idx}`} 
                          className={`rounded p-2 ${getRarityStyle(card.rarity)} cursor-pointer hover:brightness-110`}
                          onClick={() => setSelectedCard(card)}
                        >
                          <div className="font-medium">{card.name}</div>
                          <div className="flex justify-between text-xs mt-1">
                            <span>{card.cardClass}</span>
                            <span>{card.cost}费</span>
                          </div>
                          {(card.attack !== undefined && card.health !== undefined) && (
                            <div className="text-xs mt-1">
                              {card.attack}/{card.health}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* 卡牌详情模态框 */}
      {selectedCard && (
        <CardDetailModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)}
        />
      )}
    </main>
  );
} 