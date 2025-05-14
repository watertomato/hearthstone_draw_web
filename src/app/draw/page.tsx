"use client";

import { useState, useEffect } from "react";

interface CardSet {
  id: string;
  name: string;
  year?: string;
  cardCount: number;
}

interface DisplaySet {
  id: string;
  name: string;
}

interface CategorySet {
  id: string;
  name: string;
  sets: DisplaySet[];
}

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

// 添加卡牌详情模态框组件
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

export default function DrawPage() {
  const [selectedSets, setSelectedSets] = useState<Record<string, number>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [expandedSetCategory, setExpandedSetCategory] = useState<string | null>("game_expansions");
  const [cardSets, setCardSets] = useState<CardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawResults, setDrawResults] = useState<DrawResult | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);
  // 添加卡牌详情状态
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // 扩展包英文名称到中文的映射表
  const SET_NAME_TRANSLATIONS: Record<string, string> = {
    // 最新扩展包
    'EMERALD_DREAM': '漫游翡翠梦境',
    'SPACE': '深暗领域',
    'ISLAND_VACATION': '胜地历险记',
    'WHIZBANGS_WORKSHOP': '威兹班的工坊',
    'WILD_WEST': '决战荒芜之地',
    'TITANS': '泰坦诸神',
    'BATTLE_OF_THE_BANDS': '传奇音乐节',
    'RETURN_OF_THE_LICH_KING': '巫妖王的进军',
    'REVENDRETH': '纳斯利亚堡的悬案',
    'THE_SUNKEN_CITY': '探寻沉没之城',
    'ALTERAC_VALLEY': '奥特兰克的决裂',
    'STORMWIND': '暴风城下的集结',
    'THE_BARRENS': '贫瘠之地的锤炼',
    'DARKMOON_FAIRE': '疯狂的暗月马戏团',
    
    'WONDERS': '时光之穴',
    'PATH_OF_ARTHAS': '阿尔萨斯之路',
    'FESTIVAL_OF_LEGENDS': '传说节日',
    'SCHOLOMANCE': '通灵学院',
    'BOOMSDAY': '砰砰计划',
    'DRAGONS': '巨龙降临',
    'BLACK_TEMPLE': '外域的灰烬',
    'TROLL': '拉斯塔哈的大乱斗',
    'ULDUM': '奥丹姆奇兵',
    'DALARAN': '暗影崛起',
    'UNGORO': '勇闯安戈洛',
    'ICECROWN': '冰封王座的骑士',
    'GANGS': '龙争虎斗加基森',
    'KARA': '卡拉赞之夜',
    'OG': '上古之神的低语',
    'TGT': '冠军的试炼',
    'GVG': '地精大战侏儒',
    'NAXX': '纳克萨玛斯的诅咒',
    'BRM': '黑石山的火焰',
    'LOE': '探险者协会',
    'CORE': '核心',
    'EVENT': '活动',
    'EXPERT1': '经典卡牌',
    'VANILLA': '怀旧',
    'DEMON_HUNTER_INITIATE': '恶魔猎手新兵',
    'LEGACY': '传统',
    'STANDARD': '标准卡包',
    'TOY': '泰坦之力',
    'FESTIVAL': '商业节',
    'MURDER': '纳斯利亚堡的悬案',
    // 狂野模式扩展包
    'WOG': '低语森林'
  };
  
  // 获取扩展包的本地化名称
  const getLocalizedSetName = (setId: string, originalName: string): string => {
    // 尝试从映射表中获取中文名称，如果没有则使用原始名称
    return SET_NAME_TRANSLATIONS[setId] || originalName;
  };

  // 按照卡牌数量对扩展包进行分类
  const categorizeCardSets = (sets: CardSet[]): CategorySet[] => {
    // 添加本地化名称
    const localizedSets = sets.map(set => ({
      ...set,
      localizedName: getLocalizedSetName(set.id, set.name)
    }));
    
    // 根据卡牌数量分类
    const gameExpansions = localizedSets.filter(set => 
      set.cardCount >= 100 && set.cardCount <= 200
    );
    
    // 其他扩展包
    const otherSets = localizedSets.filter(set => 
      set.cardCount < 100 || set.cardCount > 200
    );
    
    return [
      {
        id: "game_expansions",
        name: "游戏扩展包",
        sets: gameExpansions.map(set => ({ 
          id: set.id, 
          name: set.localizedName || set.name
        }))
      },
      {
        id: "other",
        name: "其他扩展包",
        sets: otherSets.map(set => ({ 
          id: set.id, 
          name: set.localizedName || set.name
        }))
      }
    ];
  };

  // 从API获取扩展包数据
  useEffect(() => {
    const fetchCardSets = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/cards/sets');
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setCardSets(result.data);
        } else {
          throw new Error(result.message || '获取扩展包数据失败');
        }
      } catch (err) {
        console.error('获取扩展包出错:', err);
        setError(err instanceof Error ? err.message : '获取扩展包数据失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCardSets();
  }, []);

  // 生成扩展包分类
  const setCategories: CategorySet[] = cardSets.length > 0 
    ? categorizeCardSets(cardSets)
    : [];

  // 处理扩展包选择
  const toggleSet = (setId: string) => {
    setSelectedSets(prev => {
      const newSets = { ...prev };
      if (newSets[setId]) {
        delete newSets[setId];
      } else {
        newSets[setId] = 1; // 默认设置为1包
      }
      return newSets;
    });
  };

  // 更新包数量
  const updatePackCount = (setId: string, count: number) => {
    if (count > 0) {
      setSelectedSets(prev => ({
        ...prev,
        [setId]: count
      }));
    }
  };

  // 重置所有选择
  const resetAllSelections = () => {
    setSelectedSets({});
  };

  // 切换类别展开/折叠
  const toggleCategory = (categoryId: string) => {
    setExpandedSetCategory(prev => prev === categoryId ? null : categoryId);
  };

  // 模拟抽卡
  const simulateDrawing = async () => {
    try {
      setIsSimulating(true);
      setDrawError(null);
      
      // 按照扩展包收集抽卡请求
      const drawRequests = Object.entries(selectedSets).map(async ([setId, count]) => {
        try {
          const response = await fetch(`/api/draw?setId=${setId}&count=${count}`);
          
          if (!response.ok) {
            throw new Error(`抽卡请求失败: ${response.status}`);
          }
          
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || `抽取 ${setId} 卡包失败`);
          }
          
          return result.data;
        } catch (err) {
          console.error(`抽取 ${setId} 失败:`, err);
          throw err;
        }
      });
      
      // 等待所有请求完成
      const results = await Promise.all(drawRequests);
      
      // 合并所有扩展包的结果
      const mergedResult: DrawResult = {
        setId: 'multiple',
        setName: '多个扩展包',
        packsOpened: results.reduce((sum, r) => sum + r.packsOpened, 0),
        totalCards: results.reduce((sum, r) => sum + r.totalCards, 0),
        packs: results.flatMap(r => r.packs),
        totalRarityDistribution: {
          COMMON: 0,
          RARE: 0,
          EPIC: 0,
          LEGENDARY: 0
        }
      };
      
      // 计算总稀有度分布
      results.forEach(result => {
        Object.entries(result.totalRarityDistribution).forEach(([rarity, count]) => {
          const rarityKey = rarity as keyof typeof mergedResult.totalRarityDistribution;
          mergedResult.totalRarityDistribution[rarityKey] += (count as number);
        });
      });
      
      // 更新结果
      setDrawResults(mergedResult);
      setHasResults(true);
    } catch (err) {
      console.error("抽卡过程中出错:", err);
      setDrawError(err instanceof Error ? err.message : "抽卡失败，请稍后重试");
    } finally {
      setIsSimulating(false);
    }
  };

  // 导出结果
  const exportResults = () => {
    if (!drawResults) {
      return;
    }
    
    try {
      // 简化导出数据，只包含卡牌ID
      const exportData = {
        timestamp: new Date().toISOString(),
        cardIds: drawResults.packs.flatMap(pack => 
          pack.cards.map(card => card.id)
        )
      };
      
      // 转换为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // 创建Blob对象
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // 创建下载链接
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `hearthstone_cards_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      
      // 点击链接触发下载
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // 清理
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
    } catch (err) {
      console.error('导出结果失败:', err);
      alert('导出结果失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // 计算选中的卡包总数
  const totalSelectedPacks = Object.values(selectedSets).reduce((sum, count) => sum + count, 0);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center px-4 py-16">
        <h1 className="mb-8 text-4xl font-bold">抽卡模拟器</h1>
        
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
        
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-2">
          {/* 左侧面板 - 扩展包选择 */}
          <div className="flex h-[600px] flex-col rounded-xl bg-white/10 shadow-xl">
            {/* 顶部标题区域 */}
            <div className="rounded-t-xl bg-purple-900/30 px-6 pb-2 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">选择扩展包</h2>
                <button 
                  onClick={resetAllSelections}
                  className="rounded bg-red-600/80 px-3 py-1 text-sm hover:bg-red-600"
                >
                  重置选择
                </button>
              </div>
              
              <div className="mt-4">
                <h3 className="mb-2 text-lg font-semibold">已选择: {Object.keys(selectedSets).length} 种扩展包，共 {totalSelectedPacks} 包</h3>
              </div>
            </div>

            {/* 内容区域 - 固定高度并分配空间 */}
            <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6">
              {/* 分为上下两部分，固定高度 */}
              <div className="flex flex-col h-full">
                {/* 已选择扩展包列表 - 固定高度部分 */}
                <div className="h-[120px] mb-2">
                  <div className="custom-scrollbar h-[120px] overflow-y-auto rounded bg-black/20 p-2 pr-[calc(0.5rem+6px)]">
                    {Object.keys(selectedSets).length > 0 ? (
                      <ul className="space-y-1">
                        {Object.entries(selectedSets).map(([setId, count]) => {
                          const setName = setCategories.flatMap(c => c.sets).find(s => s.id === setId)?.name || setId;
                          return (
                            <li key={setId} className="flex items-center justify-between text-sm">
                              <span>{setName}</span>
                              <div className="flex items-center">
                                <input 
                                  type="number" 
                                  min="1"
                                  value={count}
                                  onChange={(e) => updatePackCount(setId, Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 rounded bg-purple-900/50 px-2 py-1 text-center text-white"
                                />
                                <button 
                                  onClick={() => {
                                    const newSets = { ...selectedSets };
                                    delete newSets[setId];
                                    setSelectedSets(newSets);
                                  }}
                                  className="ml-2 rounded bg-red-600/50 px-2 py-1 text-xs hover:bg-red-600"
                                >
                                  移除
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                        尚未选择任何扩展包
                      </div>
                    )}
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="h-[1px] w-full bg-white/20 mb-2"></div>
                <div className="mb-2 text-sm text-gray-300">选择一个类别查看扩展包:</div>
                
                {/* 扩展包分类区域 - 剩余高度 */}
                <div className="custom-scrollbar flex-1 overflow-y-auto pr-[6px]">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
                        <p className="text-gray-300">正在加载扩展包数据...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center p-4 rounded bg-red-900/30">
                        <p className="text-red-300 mb-2">加载失败: {error}</p>
                        <p className="text-gray-300 text-sm">显示备用数据</p>
                      </div>
                    </div>
                  ) : (
                    setCategories.map(category => (
                      <div key={category.id} className="mb-2 rounded border border-purple-600/30">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="flex w-full items-center justify-between rounded-t bg-purple-900/30 px-4 py-2 text-left hover:bg-purple-900/50"
                        >
                          <span className="font-medium">{category.name} ({category.sets.length})</span>
                          <span>{expandedSetCategory === category.id ? "▲" : "▼"}</span>
                        </button>
                        
                        {expandedSetCategory === category.id && (
                          <div className="p-2">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {category.sets.map(set => {
                                const isSelected = set.id in selectedSets;
                                return (
                                  <button
                                    key={set.id}
                                    onClick={() => toggleSet(set.id)}
                                    className={`rounded-lg px-2 py-3 text-sm transition-colors ${
                                      isSelected 
                                        ? "bg-purple-700 ring-1 ring-yellow-400" 
                                        : "bg-purple-900/50 hover:bg-purple-900/80"
                                    }`}
                                  >
                                    {set.name}
                                    {isSelected && (
                                      <span className="ml-1 rounded bg-yellow-500/20 px-1 text-xs text-yellow-300">
                                        {selectedSets[set.id] || 1}包
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 底部固定按钮区域 */}
            <div className="rounded-b-xl bg-purple-900/30 p-6">
              <button 
                onClick={simulateDrawing}
                disabled={isSimulating || Object.keys(selectedSets).length === 0}
                className={`w-full rounded-lg py-3 font-bold text-white ${
                  isSimulating || Object.keys(selectedSets).length === 0
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-yellow-600 hover:bg-yellow-500"
                }`}
              >
                {isSimulating ? "抽卡中..." : "开始抽卡"}
              </button>
            </div>
          </div>
          
          {/* 右侧面板 - 抽卡结果 */}
          <div className="h-[600px] rounded-xl bg-white/10 shadow-xl">
            <div className="rounded-t-xl bg-purple-900/30 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">抽卡结果</h2>
                {hasResults && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        // 保存抽卡结果到本地存储
                        if (drawResults) {
                          localStorage.setItem('hearthstone_draw_results', JSON.stringify(drawResults));
                          window.open('/draw/result', '_blank');
                        }
                      }}
                      className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-500"
                    >
                      查看详细结果
                    </button>
                    <button 
                      onClick={exportResults}
                      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500"
                    >
                      导出结果
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="custom-scrollbar h-[480px] overflow-y-auto p-6">
              {hasResults ? (
                <div className="space-y-4">
                  {drawError ? (
                    <div className="rounded-lg bg-red-900/30 p-4 text-red-200">
                      <h3 className="text-lg font-semibold">抽卡出错</h3>
                      <p>{drawError}</p>
                    </div>
                  ) : drawResults ? (
                    <>
                      {/* 总体统计 */}
                      <div className="rounded-lg bg-white/5 p-4">
                        <h3 className="mb-3 text-lg font-semibold">总体统计</h3>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div className="rounded bg-purple-900/30 p-2 text-center">
                            <div className="text-2xl font-bold text-white">{drawResults.packsOpened}</div>
                            <div className="text-xs text-gray-300">总开包数</div>
                          </div>
                          <div className="rounded bg-purple-900/30 p-2 text-center">
                            <div className="text-2xl font-bold text-yellow-300">
                              {drawResults.totalRarityDistribution.LEGENDARY || 0}
                            </div>
                            <div className="text-xs text-gray-300">传说卡</div>
                          </div>
                          <div className="rounded bg-purple-900/30 p-2 text-center">
                            <div className="text-2xl font-bold text-purple-300">
                              {drawResults.totalRarityDistribution.EPIC || 0}
                            </div>
                            <div className="text-xs text-gray-300">史诗卡</div>
                          </div>
                          <div className="rounded bg-purple-900/30 p-2 text-center">
                            <div className="text-2xl font-bold text-blue-300">
                              {drawResults.totalRarityDistribution.RARE || 0}
                            </div>
                            <div className="text-xs text-gray-300">稀有卡</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 按扩展包统计 */}
                      <div className="rounded-lg bg-white/5 p-4">
                        <h3 className="mb-3 text-lg font-semibold">按扩展包统计</h3>
                        <div className="max-h-full">
                          <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-300">扩展包</th>
                                <th scope="col" className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-300">开包数</th>
                                <th scope="col" className="px-3 py-2 text-center text-xs font-medium uppercase text-yellow-300">传说</th>
                                <th scope="col" className="px-3 py-2 text-center text-xs font-medium uppercase text-purple-300">史诗</th>
                                <th scope="col" className="px-3 py-2 text-center text-xs font-medium uppercase text-blue-300">稀有</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 bg-gray-800/50">
                              {Object.entries(selectedSets).map(([setId, count]) => {
                                const setName = setCategories.flatMap(c => c.sets).find(s => s.id === setId)?.name || setId;
                                
                                // 按扩展包汇总稀有度
                                const setStats = {
                                  LEGENDARY: 0,
                                  EPIC: 0,
                                  RARE: 0,
                                  COMMON: 0
                                };
                                
                                // 找出这个扩展包的所有卡包
                                if (drawResults) {
                                  drawResults.packs
                                    .filter(pack => {
                                      // 找到第一张卡牌，检查是否属于这个扩展包
                                      const firstCard = pack.cards[0];
                                      return firstCard && firstCard.cardSet === setId;
                                    })
                                    .forEach(pack => {
                                      Object.entries(pack.rarityDistribution).forEach(([rarity, rarityCount]) => {
                                        setStats[rarity as keyof typeof setStats] += rarityCount;
                                      });
                                    });
                                }
                                
                                return (
                                  <tr key={setId}>
                                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-200">{setName}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-center text-sm text-gray-300">{count}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-center text-sm text-yellow-300">
                                      {setStats.LEGENDARY}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-center text-sm text-purple-300">
                                      {setStats.EPIC}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-center text-sm text-blue-300">
                                      {setStats.RARE}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* 传说卡列表 */}
                      <div className="rounded-lg bg-white/5 p-4">
                        <h3 className="mb-2 text-lg font-semibold">获得的传说卡 ({drawResults.packs.flatMap(p => 
                          p.cards.filter(c => c.rarity === 'LEGENDARY')).length})</h3>
                        <div className="rounded bg-black/30 p-2">
                          {drawResults.packs.flatMap(p => 
                            p.cards.filter(c => c.rarity === 'LEGENDARY')).length > 0 ? (
                            <ul className="space-y-1 text-sm">
                              {drawResults.packs.flatMap(p => 
                                p.cards.filter(c => c.rarity === 'LEGENDARY')
                              ).map((card, i) => {
                                // 获取扩展包中文名
                                const setName = setCategories
                                  .flatMap(c => c.sets)
                                  .find(s => s.id === card.cardSet)?.name || card.cardSet;
                                
                                return (
                                  <li key={i} className="flex items-center justify-between border-b border-gray-700 pb-1">
                                    <div>
                                      <button 
                                        onClick={() => setSelectedCard(card)}
                                        className="font-medium text-yellow-200 hover:text-yellow-400 hover:underline"
                                      >
                                        {card.name}
                                      </button>
                                      <span className="ml-2 text-xs text-gray-400">({setName})</span>
                                    </div>
                                    <span className="rounded bg-yellow-900/30 px-2 py-0.5 text-xs text-yellow-400">
                                      {card.cost}费
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="text-center py-4 text-gray-400">
                              没有抽到传说卡
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-gray-400">无法加载抽卡结果</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  {isSimulating ? (
                    <div className="flex flex-col items-center">
                      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
                      <p className="text-xl text-gray-300">正在抽取卡牌...</p>
                      <p className="mt-2 text-sm text-gray-400">这可能需要一些时间，请耐心等待</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xl text-gray-300">请选择扩展包并点击"开始抽卡"</p>
                      <p className="mt-2 text-sm text-gray-400">抽卡结果将显示在这里</p>
                    </div>
                  )}
                </div>
              )}
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
      </div>
    </main>
  );
} 