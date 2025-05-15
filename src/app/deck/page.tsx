"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import React from "react";

// Base64编码/解码函数
const toBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    const byte = buffer[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// VarInt处理函数
const readVarInt = (bytes: Uint8Array, offset: { value: number }): number => {
  let result = 0;
  let shift = 0;
  let b = 0;
  
  do {
    if (offset.value >= bytes.length) {
      throw new Error("VarInt读取超出范围");
    }
    
    const nextByte = bytes[offset.value++];
    if (nextByte !== undefined) {
      b = nextByte;
      result |= (b & 0x7f) << shift;
      shift += 7;
    } else {
      throw new Error("读取字节失败");
    }
  } while ((b & 0x80) !== 0);
  
  return result;
};

const writeVarInt = (value: number): Uint8Array => {
  const buffer: number[] = [];
  
  while (value >= 0x80) {
    buffer.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  
  buffer.push(value & 0x7f);
  return new Uint8Array(buffer);
};

// 解析卡组代码
const parseDeckCode = (deckCode: string): { format: number, heroes: number[], cards: [number, number][] } | null => {
  try {
    const bytes = fromBase64(deckCode);
    const offset = { value: 0 };
    
    // 校验保留字节
    if (bytes[offset.value++] !== 0) {
      throw new Error("无效的卡组代码格式");
    }
    
    // 读取版本
    const version = readVarInt(bytes, offset);
    if (version !== 1) {
      throw new Error(`不支持的卡组代码版本: ${version}`);
    }
    
    // 读取模式
    const format = readVarInt(bytes, offset);
    
    // 读取英雄
    const heroCount = readVarInt(bytes, offset);
    const heroes: number[] = [];
    for (let i = 0; i < heroCount; i++) {
      heroes.push(readVarInt(bytes, offset));
    }
    
    // 读取单卡列表(1张)
    const cards: [number, number][] = [];
    const singleCardCount = readVarInt(bytes, offset);
    for (let i = 0; i < singleCardCount; i++) {
      const dbfId = readVarInt(bytes, offset);
      cards.push([dbfId, 1]);
    }
    
    // 读取双卡列表(2张)
    const doubleCardCount = readVarInt(bytes, offset);
    for (let i = 0; i < doubleCardCount; i++) {
      const dbfId = readVarInt(bytes, offset);
      cards.push([dbfId, 2]);
    }
    
    // 读取其他张数卡牌
    const nCardCount = readVarInt(bytes, offset);
    for (let i = 0; i < nCardCount; i++) {
      const dbfId = readVarInt(bytes, offset);
      const count = readVarInt(bytes, offset);
      cards.push([dbfId, count]);
    }
    
    return {
      format,
      heroes,
      cards
    };
  } catch (error) {
    console.error("解析卡组代码失败:", error);
    return null;
  }
};

// 生成卡组代码
const generateDeckCode = (heroDbfId: number, cards: { dbfId: number, count: number }[]): string => {
  try {
    // 收集单卡和双卡
    const cardsX1: number[] = [];
    const cardsX2: number[] = [];
    const cardsXN: [number, number][] = [];
    
    // 分类卡牌
    cards.forEach(({dbfId, count}) => {
      if (count === 1) {
        cardsX1.push(dbfId);
      } else if (count === 2) {
        cardsX2.push(dbfId);
      } else if (count > 2) {
        cardsXN.push([dbfId, count]);
      }
    });
    
    // 排序很重要
    cardsX1.sort((a, b) => a - b);
    cardsX2.sort((a, b) => a - b);
    
    // 构建二进制数据
    let bytes: Uint8Array[] = [];
    
    // 添加保留字节
    bytes.push(new Uint8Array([0]));
    
    // 添加版本 (1)
    bytes.push(writeVarInt(1));
    
    // 添加模式 (2 = 标准模式)
    bytes.push(writeVarInt(2));
    
    // 添加英雄
    bytes.push(writeVarInt(1)); // 英雄数量 (总是1)
    bytes.push(writeVarInt(heroDbfId));
    
    // 添加单卡
    bytes.push(writeVarInt(cardsX1.length));
    cardsX1.forEach(dbfId => {
      bytes.push(writeVarInt(dbfId));
    });
    
    // 添加双卡
    bytes.push(writeVarInt(cardsX2.length));
    cardsX2.forEach(dbfId => {
      bytes.push(writeVarInt(dbfId));
    });
    
    // 添加其他卡牌
    bytes.push(writeVarInt(cardsXN.length));
    cardsXN.forEach(([dbfId, count]) => {
      bytes.push(writeVarInt(dbfId));
      bytes.push(writeVarInt(count));
    });
    
    // 合并所有数据
    const totalLength = bytes.reduce((acc, arr) => acc + arr.length, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    
    let offset = 0;
    bytes.forEach(arr => {
      combinedBuffer.set(arr, offset);
      offset += arr.length;
    });
    
    // Base64编码
    return toBase64(combinedBuffer);
  } catch (error) {
    console.error("生成卡组代码失败:", error);
    return "";
  }
};

// 职业英雄DBF ID映射
const CLASS_HERO_DBF_IDS: Record<string, number> = {
  'MAGE': 637,      // 法师
  'HUNTER': 31,     // 猎人
  'PALADIN': 671,   // 圣骑士
  'WARRIOR': 7,     // 战士
  'DRUID': 274,     // 德鲁伊 
  'WARLOCK': 893,   // 术士
  'SHAMAN': 1066,   // 萨满
  'ROGUE': 930,     // 潜行者
  'PRIEST': 813,    // 牧师
  'DEMONHUNTER': 56550, // 恶魔猎手
  'DEATHKNIGHT': 78065  // 死亡骑士
};

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
  runeCost?: string; // 添加符文限制字段
  dbfId?: number;    // 添加DBF ID字段
}

// 添加翻译映射常量

// 职业名称翻译
const CLASS_NAMES: Record<string, string> = {
  'MAGE': '法师',
  'HUNTER': '猎人',
  'PALADIN': '圣骑士',
  'WARRIOR': '战士',
  'DRUID': '德鲁伊',
  'WARLOCK': '术士',
  'SHAMAN': '萨满',
  'ROGUE': '潜行者',
  'PRIEST': '牧师',
  'DEMONHUNTER': '恶魔猎手',
  'DEATHKNIGHT': '死亡骑士',
  'NEUTRAL': '中立'
};

// 种族翻译
const RACE_TRANSLATIONS: Record<string, string> = {
  'BEAST': '野兽',
  'DEMON': '恶魔',
  'DRAGON': '龙',
  'ELEMENTAL': '元素',
  'MECHANICAL': '机械',
  'MURLOC': '鱼人',
  'PIRATE': '海盗',
  'TOTEM': '图腾',
  'UNDEAD': '亡灵',
  'NAGA': '娜迦',
  'DRAENEI': '德莱尼',
  'QUILBOAR': '野猪人',
  'ALL': '全部',
};

// 法术类型翻译
const SPELL_SCHOOL_TRANSLATIONS: Record<string, string> = {
  'ARCANE': '奥术',
  'FIRE': '火焰',
  'FROST': '冰霜',
  'HOLY': '神圣',
  'NATURE': '自然',
  'SHADOW': '暗影',
  'FEL': '邪能',
};

// 符文类型翻译
const RUNE_TRANSLATIONS: Record<string, string> = {
  'blood': '血符文',
  'frost': '霜符文',
  'unholy': '邪符文'
};

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
  // 显示添加核心和活动包提示
  const [showCoreEventPrompt, setShowCoreEventPrompt] = useState<boolean>(false);
  // 是否正在加载核心和活动包卡牌
  const [isLoadingCoreEvent, setIsLoadingCoreEvent] = useState<boolean>(false);
  // 当前选中的职业
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  // 当前选中的费用
  const [selectedCost, setSelectedCost] = useState<number | string | null>(null);
  // 当前选中的稀有度
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  // 当前卡组
  const [deckCards, setDeckCards] = useState<string[]>([]);
  // 错误信息
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 游客提示信息
  const [guestMessage, setGuestMessage] = useState<string | null>(null);
  // 确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    show: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  const [isImportingDeckCode, setIsImportingDeckCode] = useState(false); // 添加卡组代码导入状态
  const [isExportingDeckCode, setIsExportingDeckCode] = useState(false); // 添加卡组代码导出状态
  const [showImportInput, setShowImportInput] = useState(false); // 添加显示导入输入框状态
  const [importDeckCodeInput, setImportDeckCodeInput] = useState(""); // 添加导入卡组代码输入状态
  
  // 通过ID获取卡牌信息
  const getCardById = (cardId: string): Card | null => {
    return cardData[cardId] || null;
  };
  
  // 计算当前卡组的符文情况
  const calculateRuneCounts = (): { blood: number; frost: number; unholy: number } => {
    if (deckCards.length === 0) {
      return { blood: 0, frost: 0, unholy: 0 };
    }
    
    const runeMaxValues = { blood: 0, frost: 0, unholy: 0 };
    
    // 遍历卡组中的所有卡牌
    for (const cardId of deckCards) {
      const card = getCardById(cardId);
      if (!card || !card.runeCost) continue;
      
      try {
        // 解析符文消耗
        const runeCostObj = JSON.parse(card.runeCost) as Record<string, number>;
        
        // 更新每种符文的最大值
        if (runeCostObj.blood && runeCostObj.blood > runeMaxValues.blood) {
          runeMaxValues.blood = runeCostObj.blood;
        }
        
        if (runeCostObj.frost && runeCostObj.frost > runeMaxValues.frost) {
          runeMaxValues.frost = runeCostObj.frost;
        }
        
        if (runeCostObj.unholy && runeCostObj.unholy > runeMaxValues.unholy) {
          runeMaxValues.unholy = runeCostObj.unholy;
        }
      } catch (error) {
        console.error("解析符文消耗失败:", error);
      }
    }
    
    return runeMaxValues;
  };
  
  // 获取符文计数
  const runeCounts = calculateRuneCounts();
  const totalRuneCount = runeCounts.blood + runeCounts.frost + runeCounts.unholy;

  // 检查是否会导致符文冲突(总和超过3)
  const checkRuneConflict = (cardId: string): boolean => {
    if (selectedClass !== 'DEATHKNIGHT') return false;
    
    const card = getCardById(cardId);
    if (!card || !card.runeCost) return false;
    
    try {
      // 解析卡牌的符文消耗
      const runeCostObj = JSON.parse(card.runeCost) as Record<string, number>;
      
      // 计算添加此卡牌后的最大符文消耗
      const newRuneMaxValues = { ...runeCounts };
      
      if (runeCostObj.blood && runeCostObj.blood > newRuneMaxValues.blood) {
        newRuneMaxValues.blood = runeCostObj.blood;
      }
      
      if (runeCostObj.frost && runeCostObj.frost > newRuneMaxValues.frost) {
        newRuneMaxValues.frost = runeCostObj.frost;
      }
      
      if (runeCostObj.unholy && runeCostObj.unholy > newRuneMaxValues.unholy) {
        newRuneMaxValues.unholy = runeCostObj.unholy;
      }
      
      // 计算新的符文总和
      const newTotalRuneCount = newRuneMaxValues.blood + newRuneMaxValues.frost + newRuneMaxValues.unholy;
      
      // 检查是否超过最大限制 (3)
      return newTotalRuneCount > 3;
    } catch (error) {
      console.error("检查符文冲突失败:", error);
      return false;
    }
  };

  // 检查是否是游客卡牌
  const isGuestCard = (cardId: string): boolean => {
    const card = getCardById(cardId);
    if (!card || !card.text) return false;
    
    // 检查卡牌描述是否包含"游客"
    const guestPattern = /(.{2,6})游客/;
    return guestPattern.test(card.text);
  };
  
  // 获取游客类型
  const getGuestType = (cardId: string): string => {
    const card = getCardById(cardId);
    if (!card || !card.text) return "";
    
    const guestPattern = /(.{2,6})游客/;
    const match = card.text.match(guestPattern);
    
    return match ? match[1]! : "";
  };

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
        
        // 显示是否添加核心和活动包卡牌的提示
        setShowCoreEventPrompt(true);
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

  // 处理用户选择是否添加核心和活动包卡牌
  const handleCoreEventPrompt = async (addCards: boolean) => {
    setShowCoreEventPrompt(false);
    
    if (!addCards) return;
    
    setIsLoadingCoreEvent(true);
    
    try {
      // 获取核心和活动包卡牌
      const response = await fetch('/api/cards/core-event');
      
      if (!response.ok) {
        throw new Error(`获取核心和活动包卡牌失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '获取核心和活动包卡牌失败');
      }
      
      const coreEventCards = result.data.cards;
      
      // 根据稀有度添加卡牌
      let additionalCardIds: string[] = [];
      
      coreEventCards.forEach((card: Card) => {
        // 传说卡添加1张，其他添加2张
        const count = card.rarity?.toUpperCase() === 'LEGENDARY' ? 1 : 2;
        
        // 添加指定数量的卡牌
        for (let i = 0; i < count; i++) {
          additionalCardIds.push(card.id);
        }
      });
      
      // 合并现有卡牌和新添加的卡牌
      const newCardIds = [...importedCardIds, ...additionalCardIds];
      setImportedCardIds(newCardIds);
      
      // 加载新添加的卡牌数据
      await fetchCardData(additionalCardIds);
      
      setImportMessage({
        type: 'success',
        text: `已添加 ${additionalCardIds.length} 张核心和活动包卡牌，总共 ${newCardIds.length} 张卡牌`
      });
    } catch (error) {
      console.error("添加核心和活动包卡牌失败:", error);
      setImportMessage({
        type: 'error',
        text: `添加核心和活动包卡牌失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsLoadingCoreEvent(false);
    }
  };

  // 从API获取卡牌数据
  const fetchCardData = async (cardIds: string[]) => {
    if (cardIds.length === 0) return;
    
    setIsLoadingCards(true);
    
    try {
      // 过滤掉已加载的卡牌，避免重复请求
      const newCardIds = cardIds.filter(id => !cardData[id]);
      
      if (newCardIds.length === 0) {
        setIsLoadingCards(false);
        return;
      }
      
      // 每次最多查询100张卡牌
      const batchSize = 100;
      let newCardsData: Record<string, Card> = {};
      
      // 批量查询卡牌数据
      for (let i = 0; i < newCardIds.length; i += batchSize) {
        const batch = newCardIds.slice(i, i + batchSize);
        const response = await fetch(`/api/cards/batch?ids=${batch.join(',')}`);
        
        if (!response.ok) {
          throw new Error(`获取卡牌数据失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || '获取卡牌数据失败');
        }
        
        // 合并卡牌数据
        newCardsData = { ...newCardsData, ...result.data.cardMap };
      }
      
      // 更新卡牌数据状态，合并新旧数据
      setCardData(prevData => ({ ...prevData, ...newCardsData }));
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

  // 将职业英文名转为中文
  const getClassLocalizedName = (className: string): string => {
    return CLASS_NAMES[className.toUpperCase()] || className;
  };

  // 将种族英文名转为中文
  const getRaceLocalizedName = (race: string): string => {
    return RACE_TRANSLATIONS[race.toUpperCase()] || race;
  };

  // 将法术类型英文名转为中文
  const getSpellSchoolLocalizedName = (school: string): string => {
    return SPELL_SCHOOL_TRANSLATIONS[school.toUpperCase()] || school;
  };

  // 修改获取卡牌额外信息函数，使用中文显示
  const getCardExtraInfo = (card: Card): React.ReactNode => {
    let racesOrSpellSchool: React.ReactNode = null;
    let runeInfo: React.ReactNode = null;
    
    // 对于随从，显示种族
    if (card.cardType?.toUpperCase() === 'MINION') {
      try {
        const races = card.races ? JSON.parse(card.races) : [];
        if (races.length > 0) {
          // 翻译种族名称
          const translatedRaces = races.map((race: string) => getRaceLocalizedName(race));
          racesOrSpellSchool = (
            <span className="bg-yellow-900/30 text-yellow-200 rounded px-1 py-0.5">
              {translatedRaces.join(', ')}
            </span>
          );
        }
      } catch (error) {
        console.error("解析种族失败:", error);
      }
    }
    
    // 对于法术，显示法术学派
    if (card.cardType?.toUpperCase() === 'SPELL' && card.spellSchool) {
      racesOrSpellSchool = (
        <span className="bg-yellow-900/30 text-yellow-200 rounded px-1 py-0.5">
          {getSpellSchoolLocalizedName(card.spellSchool)}
        </span>
      );
    }

    // 处理符文限制
    if (card.runeCost) {
      try {
        const runeCostObj = JSON.parse(card.runeCost) as Record<string, number>;
        const activeRunes = Object.entries(runeCostObj)
          .filter(([_, count]) => count > 0);
          
        if (activeRunes.length > 0) {
          runeInfo = (
            <>
              {activeRunes.map(([type, count]) => {
                let icon = '⚠️';
                let bgColor = 'bg-gray-800';
                let textColor = 'text-white';
                
                switch (type.toLowerCase()) {
                  case 'blood':
                    icon = '🩸';
                    bgColor = 'bg-red-900/50';
                    textColor = 'text-red-200';
                    break;
                  case 'frost':
                    icon = '❄️';
                    bgColor = 'bg-cyan-900/50';
                    textColor = 'text-cyan-200';
                    break;
                  case 'unholy':
                    icon = '☠️';
                    bgColor = 'bg-green-900/50';
                    textColor = 'text-green-200';
                    break;
                }
                
                return (
                  <span 
                    key={type} 
                    className={`${bgColor} ${textColor} rounded px-1 py-0.5 ml-1`}
                    title={`${RUNE_TRANSLATIONS[type.toLowerCase()]}：${count}`}
                  >
                    {icon}{count}
                  </span>
                );
              })}
            </>
          );
        }
      } catch (error) {
        console.error("解析符文消耗失败:", error);
      }
    }
    
    // 如果都没有，返回空div以保持一致的布局
    if (!racesOrSpellSchool && !runeInfo) {
      return <></>;
    }
    
    return (
      <>
        {racesOrSpellSchool}
        {runeInfo}
      </>
    );
  };

  // 格式化卡牌描述文本
  const formatCardText = (text: string): string => {
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
  
  // 修改搜索函数，确保搜索同时匹配中英文
  const searchCards = (cards: { id: string; count: number; card: Card | null }[], term: string): { id: string; count: number; card: Card | null }[] => {
    if (!term.trim()) return cards;
    
    const lowerCaseTerm = term.toLowerCase();
    
    return cards.filter(({ card }) => {
      if (!card) return false;
      
      // 搜索名称
      if (card.name.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索职业 (中英文)
      if (card.cardClass.toLowerCase().includes(lowerCaseTerm)) return true;
      const translatedClass = getClassLocalizedName(card.cardClass);
      if (translatedClass.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索扩展包
      const setName = getSetLocalizedName(card.cardSet);
      if (setName.toLowerCase().includes(lowerCaseTerm) || card.cardSet.toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索卡牌类型
      const cardTypeName = getCardTypeName(card.cardType);
      if (cardTypeName.toLowerCase().includes(lowerCaseTerm) || (card.cardType && card.cardType.toLowerCase().includes(lowerCaseTerm))) return true;
      
      // 搜索描述文本
      if (card.text && formatCardText(card.text).toLowerCase().includes(lowerCaseTerm)) return true;
      
      // 搜索种族和法术类型 (中英文)
      try {
        // 搜索种族
        if (card.races) {
          const races = JSON.parse(card.races);
          // 检查英文原名匹配
          if (races.some((race: string) => race.toLowerCase().includes(lowerCaseTerm))) return true;
          // 检查中文翻译匹配
          if (races.some((race: string) => {
            const translatedRace = getRaceLocalizedName(race);
            return translatedRace.toLowerCase().includes(lowerCaseTerm);
          })) return true;
        }
        
        // 单一种族
        if (card.race) {
          if (card.race.toLowerCase().includes(lowerCaseTerm)) return true;
          const translatedRace = getRaceLocalizedName(card.race);
          if (translatedRace.toLowerCase().includes(lowerCaseTerm)) return true;
        }
        
        // 搜索法术类型
        if (card.spellSchool) {
          if (card.spellSchool.toLowerCase().includes(lowerCaseTerm)) return true;
          const translatedSchool = getSpellSchoolLocalizedName(card.spellSchool);
          if (translatedSchool.toLowerCase().includes(lowerCaseTerm)) return true;
        }
        
        // 搜索符文类型
        if (card.runeCost) {
          const runeCostObj = JSON.parse(card.runeCost) as Record<string, number>;
          const activeRunes = Object.entries(runeCostObj)
            .filter(([_, count]) => count > 0)
            .map(([type]) => type.toLowerCase());
            
          // 检查英文原名匹配
          if (activeRunes.some(type => type.includes(lowerCaseTerm))) return true;
          // 检查中文翻译匹配
          if (activeRunes.some(type => {
            const translatedRune = RUNE_TRANSLATIONS[type] || '';
            return translatedRune.toLowerCase().includes(lowerCaseTerm);
          })) return true;
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

  // 处理职业选择
  const handleClassSelect = (cardClass: string | null) => {
    // 如果选择的是不同的职业，则清空卡组
    if (selectedClass !== cardClass && deckCards.length > 0) {
      setConfirmDialog({
        show: true,
        message: '更换职业将清空当前卡组，是否继续？',
        onConfirm: () => {
          setDeckCards([]);
          setSelectedClass(cardClass);
          setConfirmDialog(prev => ({ ...prev, show: false }));
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, show: false }));
        }
      });
    } else {
      setSelectedClass(cardClass);
    }
  };

  // 处理费用筛选
  const handleCostSelect = (cost: number | string | null) => {
    // 如果点击的是已选中的费用，则取消选择
    if (cost === selectedCost) {
      setSelectedCost(null);
    } else {
      setSelectedCost(cost);
    }
  };

  // 处理稀有度筛选
  const handleRaritySelect = (rarity: string | null) => {
    // 如果点击的是已选中的稀有度，则取消选择
    if (rarity === selectedRarity) {
      setSelectedRarity(null);
    } else {
      setSelectedRarity(rarity);
    }
  };

  // 添加卡牌到卡组
  const addCardToDeck = (cardId: string) => {
    // 获取卡牌信息
    const card = getCardById(cardId);
    if (!card) return;

    // 检查是否选择了职业
    if (selectedClass === null) {
      setErrorMessage('请先选择一个职业');
      // 3秒后清除错误信息
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // 检查卡牌是否符合当前所选职业
    if (card.cardClass.toUpperCase() !== selectedClass && card.cardClass.toUpperCase() !== 'NEUTRAL') {
      setErrorMessage('只能添加所选职业和中立卡牌');
      // 3秒后清除错误信息
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // 检查当前卡组张数是否已达30张上限
    if (deckCards.length >= 30) {
      setErrorMessage('卡组已满30张');
      // 3秒后清除错误信息
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // 检查符文冲突
    if (checkRuneConflict(cardId)) {
      setErrorMessage('符文冲突：添加该卡牌后符文总和将超过3点');
      // 3秒后清除错误信息
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // 统计当前卡组中该卡牌的数量
    const currentCount = deckCards.filter(id => id === cardId).length;
    
    // 检查卡牌数量限制
    const isLegendary = card.rarity.toUpperCase() === 'LEGENDARY';
    const maxAllowed = isLegendary ? 1 : 2;
    
    if (currentCount >= maxAllowed) {
      setErrorMessage(`${isLegendary ? '传说卡' : '普通卡'}最多只能添加${maxAllowed}张`);
      // 3秒后清除错误信息
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    
    // 检查是否超出拥有数量
    const ownedCount = importedCardIds.filter(id => id === cardId).length;
    if (currentCount >= ownedCount) {
      setErrorMessage('超出拥有数量');
      // 3秒后清除错误信息
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    
    // 添加卡牌到卡组
    setDeckCards(prev => [...prev, cardId]);
    
    // 检查是否是游客卡牌并显示提示
    if (isGuestCard(cardId)) {
      const guestType = getGuestType(cardId);
      setGuestMessage(`检测到${guestType}游客卡牌，已添加到卡组`);
      // 3秒后清除游客信息
      setTimeout(() => setGuestMessage(null), 3000);
    }
  };

  // 从卡组移除卡牌
  const removeCardFromDeck = (index: number) => {
    // 获取要移除的卡牌ID
    const cardId = deckCards[index];
    
    // 移除卡牌
    setDeckCards(prev => prev.filter((_, i) => i !== index));
    
    // 检查是否是游客卡牌并显示提示
    if (cardId && isGuestCard(cardId)) {
      const guestType = getGuestType(cardId);
      setGuestMessage(`已从卡组移除${guestType || ""}游客卡牌`);
      // 3秒后清除游客信息
      setTimeout(() => setGuestMessage(null), 3000);
    }
  };

  // 清空卡组
  const clearDeck = () => {
    // 检查卡组中是否有游客卡牌
    const guestCards = deckCards.filter(cardId => isGuestCard(cardId));
    
    if (guestCards.length > 0) {
      // 如果有游客卡牌，显示提示
      setGuestMessage(`已清空卡组，包含 ${guestCards.length} 张游客卡牌`);
      // 3秒后清除游客信息
      setTimeout(() => setGuestMessage(null), 3000);
    }
    
    setDeckCards([]);
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

  // 获取所有卡牌并应用搜索和职业过滤
  const allCards = prepareCardsForDisplay();
  
  // 首先应用职业筛选
  const classFilteredCards = selectedClass 
    ? allCards.filter(({ card }) => 
        card && (card.cardClass.toUpperCase() === selectedClass || card.cardClass.toUpperCase() === 'NEUTRAL'))
    : allCards;
  
  // 然后应用费用筛选
  const costFilteredCards = selectedCost === null
    ? classFilteredCards
    : classFilteredCards.filter(({ card }) => {
        if (!card) return false;
        
        if (selectedCost === "8+") {
          return card.cost >= 8;
        } else {
          return card.cost === Number(selectedCost);
        }
      });
  
  // 应用稀有度筛选
  const rarityFilteredCards = selectedRarity === null
    ? costFilteredCards
    : costFilteredCards.filter(({ card }) => {
        if (!card) return false;
        return card.rarity.toUpperCase() === selectedRarity.toUpperCase();
      });
  
  // 最后应用搜索过滤
  const filteredCards = searchCards(rarityFilteredCards, searchTerm);

  // 处理导入卡组代码
  const handleImportDeckCode = () => {
    // 显示自定义输入对话框
    setShowImportInput(true);
    setImportDeckCodeInput("");
  };
  
  // 处理提交导入卡组代码
  const handleSubmitImportCode = () => {
    const deckCode = importDeckCodeInput.trim();
    if (!deckCode) {
      setShowImportInput(false);
      return;
    }
    
    // 解析卡组代码
    const deckData = parseDeckCode(deckCode);
    if (!deckData) {
      setErrorMessage("卡组代码格式无效，请检查后重试");
      setTimeout(() => setErrorMessage(null), 3000);
      setShowImportInput(false);
      return;
    }
    
    // 从英雄ID确定职业
    let targetClass: string | null = null;
    if (deckData.heroes.length > 0) {
      const heroDbfId = deckData.heroes[0];
      for (const [className, dbfId] of Object.entries(CLASS_HERO_DBF_IDS)) {
        if (dbfId === heroDbfId) {
          targetClass = className;
          break;
        }
      }
    }
    
    // 关闭输入对话框
    setShowImportInput(false);
    
    // 如果职业不匹配，需要确认切换职业
    if (targetClass && targetClass !== selectedClass) {
      setConfirmDialog({
        show: true,
        message: `该卡组属于${CLASS_NAMES[targetClass] || targetClass}职业，需要切换职业，这将清空当前卡组。是否继续？`,
        onConfirm: () => {
          setDeckCards([]);
          setSelectedClass(targetClass);
          setConfirmDialog(prev => ({ ...prev, show: false }));
          // 切换职业后导入卡牌
          if (targetClass) {
            setIsImportingDeckCode(true); // 设置导入状态
            void importDeckCards(deckData, targetClass);
          }
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, show: false }));
        }
      });
    } else if (!targetClass) {
      // 无法识别职业
      if (!selectedClass) {
        setErrorMessage("无法识别卡组职业，请先选择一个职业");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      // 使用当前选择的职业
      setIsImportingDeckCode(true); // 设置导入状态
      void importDeckCards(deckData, selectedClass);
    } else {
      // 职业匹配，直接导入
      if (deckCards.length > 0) {
        setConfirmDialog({
          show: true,
          message: "导入新卡组将清空当前卡组，是否继续？",
          onConfirm: () => {
            setDeckCards([]);
            setConfirmDialog(prev => ({ ...prev, show: false }));
            const finalClass = targetClass || selectedClass;
            if (finalClass) {
              setIsImportingDeckCode(true); // 设置导入状态
              void importDeckCards(deckData, finalClass);
            }
          },
          onCancel: () => {
            setConfirmDialog(prev => ({ ...prev, show: false }));
          }
        });
      } else {
        const finalClass = targetClass || selectedClass;
        if (finalClass) {
          setIsImportingDeckCode(true); // 设置导入状态
          void importDeckCards(deckData, finalClass);
        }
      }
    }
  };
  
  // 从解析的卡组数据导入卡牌
  const importDeckCards = async (deckData: { cards: [number, number][] }, targetClass: string) => {
    try {
      setIsLoadingCards(true);
      
      // 获取所有需要查询的DBF ID
      const dbfIds = deckData.cards.map(([dbfId]) => dbfId);
      
      if (dbfIds.length === 0) {
        setErrorMessage("卡组中没有卡牌");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      console.log(`需要查询 ${dbfIds.length} 个DBF ID的卡牌信息...`);
      
      // 创建DBF ID到卡牌信息的映射
      const dbfIdToCardMap: Record<number, Card> = {};
      
      try {
        // 直接调用API端点获取所有卡牌信息
        const response = await fetch(`/api/cards/dbfid?ids=${dbfIds.join(',')}`);
        
        if (!response.ok) {
          throw new Error(`获取DBF ID卡牌信息失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || '获取DBF ID卡牌信息失败');
        }
        
        // 处理API返回的卡牌信息
        const newDbfIdMap = result.data.dbfIdToCardMap || {};
        for (const [dbfIdStr, card] of Object.entries(newDbfIdMap)) {
          const dbfId = parseInt(dbfIdStr, 10);
          if (!isNaN(dbfId)) {
            dbfIdToCardMap[dbfId] = card as Card;
            
            // 同时更新cardData，以便将来使用
            if (card && (card as Card).id) {
              setCardData(prev => ({ ...prev, [(card as Card).id]: card as Card }));
            }
          }
        }
        
        console.log(`已从API获取 ${Object.keys(newDbfIdMap).length} 张卡牌信息`);
        
        // 报告未找到的卡牌
        const missingDbfIds = result.data.missingDbfIds || [];
        if (missingDbfIds.length > 0) {
          console.warn(`有 ${missingDbfIds.length} 个DBF ID在数据库中未找到`);
        }
      } catch (error) {
        console.error("获取DBF ID卡牌信息失败:", error);
        throw error; // 重新抛出错误，让外层catch处理
      }
      
      // 收集导入过程的信息
      const newDeckCards: string[] = [];
      const skippedCards: { name: string, reason: string }[] = [];
      
      // 处理每张卡
      for (const [dbfId, count] of deckData.cards) {
        // 查找卡牌信息
        const card = dbfIdToCardMap[dbfId];
        if (!card) {
          skippedCards.push({ name: `未知卡牌 (ID: ${dbfId})`, reason: "未找到卡牌数据" });
          console.log(`未找到DBF ID为${dbfId}的卡牌数据`);
          continue;
        }
        
        // 检查卡牌职业是否符合
        if (card.cardClass.toUpperCase() !== targetClass && card.cardClass.toUpperCase() !== 'NEUTRAL') {
          skippedCards.push({ name: card.name, reason: `卡牌职业(${card.cardClass})与选择职业(${targetClass})不符` });
          continue;
        }
        
        // 检查当前拥有的卡牌数量
        const ownedCount = importedCardIds.filter(id => id === card.id).length;
        if (ownedCount === 0) {
          skippedCards.push({ name: card.name, reason: "您未拥有此卡牌" });
          continue;
        }
        
        // 处理数量限制
        const isLegendary = card.rarity.toUpperCase() === 'LEGENDARY';
        const maxAllowed = isLegendary ? 1 : 2;
        const actualCount = Math.min(count, ownedCount, maxAllowed);
        
        if (actualCount < count) {
          let reason = "";
          if (ownedCount < count) reason += `拥有数量不足(${ownedCount}/${count}) `;
          if (maxAllowed < count) reason += `规则限制(最多${maxAllowed}张) `;
          
          if (actualCount > 0) {
            skippedCards.push({ name: card.name, reason: `只能添加${actualCount}/${count}张，${reason}` });
          } else {
            skippedCards.push({ name: card.name, reason });
            continue;
          }
        }
        
        // 导入时不检查符文限制
        
        // 添加卡牌到新卡组
        for (let i = 0; i < actualCount; i++) {
          if (newDeckCards.length >= 30) {
            skippedCards.push({ name: `${card.name} 及之后的卡牌`, reason: "卡组已满30张" });
            break;
          }
          newDeckCards.push(card.id);
        }
      }
      
      // 更新卡组
      setDeckCards(newDeckCards);
      
      // 显示导入结果
      if (skippedCards.length > 0) {
        // 使用<br>标签而不是\n来确保HTML中正确换行
        const skippedMessage = skippedCards.map(({name, reason}) => `- ${name}: ${reason}`).join("<br>");
        
        setConfirmDialog({
          show: true,
          message: `已导入${newDeckCards.length}张卡牌，${skippedCards.length}张卡牌未能完全导入。<br><br>详情如下：<br>${skippedMessage}`,
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, show: false }));
          },
          onCancel: () => {
            setConfirmDialog(prev => ({ ...prev, show: false }));
          }
        });
      } else if (newDeckCards.length > 0) {
        setErrorMessage(`成功导入${newDeckCards.length}张卡牌`);
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        setErrorMessage("未能导入任何卡牌");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (error) {
      console.error("导入卡组失败:", error);
      setErrorMessage("导入卡组失败: " + (error instanceof Error ? error.message : "未知错误"));
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      // 无论成功还是失败，都重置导入状态
      setIsImportingDeckCode(false);
      setIsLoadingCards(false);
    }
  };
  
  // 处理导出卡组代码
  const handleExportDeckCode = async () => {
    try {
      if (!selectedClass) {
        setErrorMessage("请先选择一个职业");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      if (deckCards.length === 0) {
        setErrorMessage("卡组为空，无法导出");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      // 检查卡组是否满30张
      if (deckCards.length < 30) {
        setErrorMessage(`当前卡组只有${deckCards.length}张卡牌，卡组必须满30张才能导出`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      // 获取英雄DBF ID
      const heroDbfId = CLASS_HERO_DBF_IDS[selectedClass];
      if (!heroDbfId) {
        setErrorMessage(`无法获取${CLASS_NAMES[selectedClass] || selectedClass}的英雄ID`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      // 设置导出状态
      setIsExportingDeckCode(true);
      
      // 获取卡组中所有卡牌ID和对应数量
      type CardWithCount = { id: string; count: number };
      const deckCardsWithCount: CardWithCount[] = [];
      
      // 统计每张卡牌的数量
      deckCards.forEach(cardId => {
        const existingCard = deckCardsWithCount.find(c => c.id === cardId);
        if (existingCard) {
          existingCard.count++;
        } else {
          deckCardsWithCount.push({ id: cardId, count: 1 });
        }
      });
      
      // 创建卡牌ID到DBF ID的映射
      const cardIdToDbfMap: Record<string, number> = {};
      
      // 收集所有需要查询DBF ID的卡牌ID
      const cardsNeedingDbfId = deckCardsWithCount
        .filter(card => !cardIdToDbfMap[card.id])
        .map(card => card.id);
      
      if (cardsNeedingDbfId.length > 0) {
        // 从API获取卡牌信息
        try {
          // 首先获取卡牌的基本信息
          const cardsResponse = await fetch(`/api/cards/batch?ids=${cardsNeedingDbfId.join(',')}`);
          
          if (!cardsResponse.ok) {
            throw new Error(`获取卡牌信息失败: ${cardsResponse.status}`);
          }
          
          const cardsResult = await cardsResponse.json();
          
          if (!cardsResult.success) {
            throw new Error(cardsResult.message || '获取卡牌信息失败');
          }
          
          // 从卡牌信息中提取DBF ID
          const cards = cardsResult.data.cards || [];
          for (const card of cards) {
            if (card.id && card.dbfId !== undefined) {
              cardIdToDbfMap[card.id] = card.dbfId;
            }
          }
          
          // 检查是否有卡牌仍然缺少DBF ID
          const stillMissingDbfIds = deckCardsWithCount
            .filter(card => !cardIdToDbfMap[card.id])
            .map(card => card.id);
          
          if (stillMissingDbfIds.length > 0) {
            console.warn(`仍有 ${stillMissingDbfIds.length} 张卡牌缺少DBF ID，无法导出`);
            setErrorMessage(`有${stillMissingDbfIds.length}张卡牌缺少必要信息，无法导出完整卡组`);
            setTimeout(() => setErrorMessage(null), 3000);
            return;
          }
        } catch (error) {
          console.error("获取卡牌DBF ID失败:", error);
          throw error;
        }
      }
      
      // 准备生成卡组代码所需的数据
      const cardDbfWithCount = deckCardsWithCount
        .filter(card => typeof cardIdToDbfMap[card.id] === 'number') // 确保DBF ID存在且是number类型
        .map(card => ({
          dbfId: cardIdToDbfMap[card.id] as number, // 使用类型断言确保是number
          count: card.count
        }));
      
      // 生成卡组代码
      const deckCode = generateDeckCode(heroDbfId, cardDbfWithCount);
      
      if (!deckCode) {
        setErrorMessage("生成卡组代码失败");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      // 复制到剪贴板
      navigator.clipboard.writeText(deckCode)
        .then(() => {
          // 显示导出成功对话框
          setConfirmDialog({
            show: true,
            message: `卡组代码已复制到剪贴板:<br><br><div class="bg-gray-900 p-3 rounded-lg break-all text-sm font-mono overflow-x-auto max-h-36 overflow-y-auto">${deckCode}</div>`,
            onConfirm: () => {
              setConfirmDialog(prev => ({ ...prev, show: false }));
            },
            onCancel: () => {
              setConfirmDialog(prev => ({ ...prev, show: false }));
            }
          });
        })
        .catch(() => {
          // 如果剪贴板API不可用，至少显示代码
          alert(`卡组代码:\n\n${deckCode}\n\n请手动复制`);
        });
    } catch (error) {
      console.error("导出卡组失败:", error);
      setErrorMessage("导出卡组失败: " + (error instanceof Error ? error.message : "未知错误"));
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsExportingDeckCode(false);
    }
  };

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
          
          /* 右侧卡组专用滚动条样式 */
          .deck-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          
          .deck-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, rgba(168, 85, 247, 0.6), rgba(217, 70, 239, 0.6));
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .deck-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, rgba(168, 85, 247, 0.8), rgba(217, 70, 239, 0.8));
          }
          
          .deck-scrollbar::-webkit-scrollbar-track {
            background: rgba(30, 41, 59, 0.4);
            border-radius: 4px;
            box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
            margin: 2px 0;
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
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === null 
                        ? "bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-400 font-bold shadow-md" 
                        : "bg-gray-700 hover:bg-gray-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect(null)}
                  >
                    全部
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'MAGE' 
                        ? "bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 font-bold shadow-md" 
                        : "bg-blue-700 hover:bg-blue-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('MAGE')}
                  >
                    {CLASS_NAMES['MAGE']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'HUNTER' 
                        ? "bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-400 font-bold shadow-md" 
                        : "bg-green-700 hover:bg-green-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('HUNTER')}
                  >
                    {CLASS_NAMES['HUNTER']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'PALADIN' 
                        ? "bg-gradient-to-br from-yellow-500 to-yellow-700 border-2 border-yellow-400 font-bold shadow-md" 
                        : "bg-yellow-700 hover:bg-yellow-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('PALADIN')}
                  >
                    {CLASS_NAMES['PALADIN']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'WARLOCK' 
                        ? "bg-gradient-to-br from-gray-800 to-black border-2 border-gray-500 font-bold shadow-md" 
                        : "bg-black hover:bg-gray-800 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('WARLOCK')}
                  >
                    {CLASS_NAMES['WARLOCK']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'WARRIOR' 
                        ? "bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 font-bold shadow-md" 
                        : "bg-red-700 hover:bg-red-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('WARRIOR')}
                  >
                    {CLASS_NAMES['WARRIOR']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'PRIEST' 
                        ? "bg-gradient-to-br from-gray-200 to-white text-black border-2 border-white font-bold shadow-md" 
                        : "bg-white hover:bg-gray-200 text-black border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('PRIEST')}
                  >
                    {CLASS_NAMES['PRIEST']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'DRUID' 
                        ? "bg-gradient-to-br from-orange-600 to-orange-800 border-2 border-orange-400 font-bold shadow-md" 
                        : "bg-orange-700 hover:bg-orange-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('DRUID')}
                  >
                    {CLASS_NAMES['DRUID']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'DEMONHUNTER' 
                        ? "bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-400 font-bold shadow-md" 
                        : "bg-purple-700 hover:bg-purple-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('DEMONHUNTER')}
                  >
                    {CLASS_NAMES['DEMONHUNTER']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'SHAMAN' 
                        ? "bg-gradient-to-br from-teal-600 to-teal-800 border-2 border-teal-400 font-bold shadow-md" 
                        : "bg-teal-700 hover:bg-teal-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('SHAMAN')}
                  >
                    {CLASS_NAMES['SHAMAN']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'ROGUE' 
                        ? "bg-gradient-to-br from-pink-600 to-pink-800 border-2 border-pink-400 font-bold shadow-md" 
                        : "bg-pink-700 hover:bg-pink-600 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('ROGUE')}
                  >
                    {CLASS_NAMES['ROGUE']}
                  </button>
                  <button 
                    className={`rounded-lg p-2 text-sm transition-colors h-9 flex items-center justify-center ${
                      selectedClass === 'DEATHKNIGHT' 
                        ? "bg-gradient-to-br from-cyan-700 to-cyan-900 border-2 border-cyan-400 font-bold shadow-md" 
                        : "bg-cyan-800 hover:bg-cyan-700 border-2 border-transparent"
                    }`}
                    onClick={() => handleClassSelect('DEATHKNIGHT')}
                  >
                    {CLASS_NAMES['DEATHKNIGHT']}
                  </button>
                </div>
              </div>

              <div className="md:w-1/2">
                <h2 className="mb-4 text-2xl font-bold">卡牌筛选</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm">费用</label>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-9">
                      {[0, 1, 2, 3, 4, 5, 6, 7, "8+"].map((cost) => (
                        <button 
                          key={cost} 
                          className={`rounded p-2 text-sm transition-colors ${
                            selectedCost === cost
                              ? "bg-purple-700 border-2 border-purple-400 font-bold"
                              : "bg-white/20 hover:bg-white/30 border-2 border-transparent"
                          }`}
                          onClick={() => handleCostSelect(cost)}
                        >
                          {cost}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm">稀有度</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button 
                        className={`rounded p-2 text-sm transition-colors ${
                          selectedRarity === 'COMMON'
                            ? "bg-purple-700 border-2 border-purple-400 font-bold"
                            : "bg-white/20 hover:bg-white/30 border-2 border-transparent"
                        }`}
                        onClick={() => handleRaritySelect('COMMON')}
                      >
                        普通
                      </button>
                      <button 
                        className={`rounded p-2 text-sm transition-colors ${
                          selectedRarity === 'RARE'
                            ? "bg-purple-700 border-2 border-purple-400 font-bold"
                            : "bg-white/20 hover:bg-white/30 border-2 border-transparent"
                        }`}
                        onClick={() => handleRaritySelect('RARE')}
                      >
                        稀有
                      </button>
                      <button 
                        className={`rounded p-2 text-sm transition-colors ${
                          selectedRarity === 'EPIC'
                            ? "bg-purple-700 border-2 border-purple-400 font-bold"
                            : "bg-white/20 hover:bg-white/30 border-2 border-transparent"
                        }`}
                        onClick={() => handleRaritySelect('EPIC')}
                      >
                        史诗
                      </button>
                      <button 
                        className={`rounded p-2 text-sm transition-colors ${
                          selectedRarity === 'LEGENDARY'
                            ? "bg-purple-700 border-2 border-purple-400 font-bold"
                            : "bg-white/20 hover:bg-white/30 border-2 border-transparent"
                        }`}
                        onClick={() => handleRaritySelect('LEGENDARY')}
                      >
                        传说
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 添加核心和活动包卡牌的提示对话框 */}
          {showCoreEventPrompt && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
              <div className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">添加核心和活动包卡牌？</h3>
                <p className="text-gray-300 mb-6">
                  是否自动添加所有核心和活动包的卡牌？将为每张传说卡添加1张，其他稀有度卡牌添加2张。
                </p>
                <div className="flex justify-center gap-6">
                  <button 
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center"
                    onClick={() => handleCoreEventPrompt(true)}
                    disabled={isLoadingCoreEvent}
                  >
                    {isLoadingCoreEvent ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        加载中...
                      </>
                    ) : '是'}
                  </button>
                  <button 
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
                    onClick={() => handleCoreEventPrompt(false)}
                    disabled={isLoadingCoreEvent}
                  >
                    否
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 自定义确认对话框 */}
          {confirmDialog.show && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
              <div className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border-2 border-purple-500">
                <h3 className="text-xl font-bold mb-4 text-white">确认操作</h3>
                <p className="text-gray-300 mb-6" dangerouslySetInnerHTML={{ __html: confirmDialog.message }}>
                </p>
                <div className="flex justify-center gap-6">
                  <button 
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                    onClick={confirmDialog.onConfirm}
                  >
                    确定
                  </button>
                  <button 
                    className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition-colors"
                    onClick={confirmDialog.onCancel}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 错误信息提示 */}
          {errorMessage && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-white px-5 py-3 rounded-lg shadow-lg border border-red-500 z-50 min-w-[280px] text-center">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 text-red-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {errorMessage}
              </div>
            </div>
          )}
          
          {/* 游客提示信息 */}
          {guestMessage && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-700/90 text-white px-5 py-3 rounded-lg shadow-lg border border-yellow-500 z-50 min-w-[280px] text-center">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 8a1 1 0 102 0v-4a1 1 0 10-2 0v4z" clipRule="evenodd"></path>
                </svg>
                {guestMessage}
              </div>
            </div>
          )}
          
          {/* 下方卡牌区域 - 使用grid布局 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 可用卡牌区域 - 占据2/3宽度 */}
            <div className="rounded-xl bg-white/10 p-6 shadow-xl lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  可用卡牌
                  {selectedClass && (
                    <span className="ml-2 text-sm font-normal bg-purple-800 px-2 py-0.5 rounded-full">
                      {getClassLocalizedName(selectedClass)}
                    </span>
                  )}
                </h2>
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
                          className={`rounded p-2 text-xs border ${card ? getRarityStyle(card.rarity) : 'border-gray-500 bg-white/5'} cursor-pointer hover:bg-white/10 hover:border-purple-400 transition-colors`}
                          onClick={() => card && addCardToDeck(id)}
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
                                    {getClassLocalizedName(card.cardClass)}
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
                                
                                {/* 种族/法术类型和符文限制 */}
                                {getCardExtraInfo(card)}
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
            <div className="rounded-xl bg-white/10 p-6 shadow-xl lg:col-span-1 flex flex-col h-full">
              <h2 className="mb-4 text-2xl font-bold">当前卡组</h2>
              <div className="mb-2 flex justify-between">
                <span>卡牌数量: {deckCards.length}/30</span>
                {/* 添加符文配置显示在卡牌数量行的右边 */}
                {selectedClass === 'DEATHKNIGHT' && totalRuneCount > 0 && (
                  <div className="flex space-x-2">
                    {runeCounts.blood > 0 && (
                      <span className="bg-red-900/70 text-red-200 rounded px-1.5 py-0.5 text-xs flex items-center">
                        <span>🩸</span>
                        <span className="ml-0.5 font-semibold">{runeCounts.blood}</span>
                      </span>
                    )}
                    {runeCounts.frost > 0 && (
                      <span className="bg-cyan-900/70 text-cyan-200 rounded px-1.5 py-0.5 text-xs flex items-center">
                        <span>❄️</span>
                        <span className="ml-0.5 font-semibold">{runeCounts.frost}</span>
                      </span>
                    )}
                    {runeCounts.unholy > 0 && (
                      <span className="bg-green-900/70 text-green-200 rounded px-1.5 py-0.5 text-xs flex items-center">
                        <span>☠️</span>
                        <span className="ml-0.5 font-semibold">{runeCounts.unholy}</span>
                      </span>
                    )}
                  </div>
                )}
                <button 
                  className="rounded bg-red-700 px-2 py-1 text-sm hover:bg-red-600"
                  onClick={clearDeck}
                >
                  清空卡组
                </button>
              </div>
              
              {/* 移除单独的符文显示区域 */}
              <div className="deck-scrollbar h-[450px] overflow-y-auto rounded-lg bg-white/5 p-4">
                {deckCards.length > 0 ? (
                  <div className="space-y-1">
                    {/* 按费用排序并分组显示卡组卡牌 */}
                    {Array.from(new Set(deckCards)).sort((a, b) => {
                      const cardA = getCardById(a);
                      const cardB = getCardById(b);
                      if (!cardA || !cardB) return 0;
                      return cardA.cost - cardB.cost || cardA.name.localeCompare(cardB.name);
                    }).map((cardId) => {
                      const card = getCardById(cardId);
                      const cardCount = deckCards.filter(id => id === cardId).length;
                      
                      if (!card) return null;
                      
                      return (
                        <div 
                          key={cardId} 
                          className={`flex items-center justify-between p-1.5 rounded ${getRarityStyle(card.rarity)} hover:bg-white/10 cursor-pointer`}
                          onClick={() => removeCardFromDeck(deckCards.lastIndexOf(cardId))}
                        >
                          <div className="flex items-center">
                            <span className="bg-amber-800 text-white rounded-lg px-1.5 py-0.5 mr-1.5 text-center min-w-[1.25rem] text-xs">
                              {card.cost}
                            </span>
                            <span className="font-medium text-yellow-200 truncate max-w-[120px]" title={card.name}>
                              {card.name}
                            </span>
                          </div>
                          <div className="flex items-center">
                            {/* 添加符文显示 */}
                            {card.runeCost && (
                              <div className="flex mr-1.5">
                                {(() => {
                                  try {
                                    const runeCostObj = JSON.parse(card.runeCost) as Record<string, number>;
                                    return Object.entries(runeCostObj)
                                      .filter(([_, count]) => count > 0)
                                      .map(([type, count]) => {
                                        let icon = '';
                                        let textColor = '';
                                        
                                        switch (type.toLowerCase()) {
                                          case 'blood':
                                            icon = '🩸';
                                            textColor = 'text-red-300';
                                            break;
                                          case 'frost':
                                            icon = '❄️';
                                            textColor = 'text-cyan-300';
                                            break;
                                          case 'unholy':
                                            icon = '☠️';
                                            textColor = 'text-green-300';
                                            break;
                                        }
                                        
                                        return (
                                          <span 
                                            key={type} 
                                            className={`${textColor} text-xs mr-0.5`}
                                            title={`${RUNE_TRANSLATIONS[type.toLowerCase()]}：${count}`}
                                          >
                                            {icon}{count}
                                          </span>
                                        );
                                      });
                                  } catch (error) {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                            <span className="bg-purple-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                              {cardCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">卡组是空的</p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button 
                  className={`rounded-lg ${isImportingDeckCode 
                    ? "bg-gray-600 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-500"} py-2 font-bold flex items-center justify-center`}
                  onClick={handleImportDeckCode}
                  disabled={isImportingDeckCode}
                >
                  {isImportingDeckCode ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      导入中...
                    </>
                  ) : "导入卡组代码"}
                </button>
                <button 
                  className={`rounded-lg ${isExportingDeckCode 
                    ? "bg-gray-600 cursor-not-allowed" 
                    : "bg-yellow-600 hover:bg-yellow-500"} py-2 font-bold flex items-center justify-center`}
                  onClick={handleExportDeckCode}
                  disabled={isExportingDeckCode}
                >
                  {isExportingDeckCode ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      导出中...
                    </>
                  ) : "导出卡组代码"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 自定义导入卡组代码对话框 */}
      {showImportInput && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border-2 border-purple-500">
            <h3 className="text-xl font-bold mb-4 text-white">导入卡组代码</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">请输入炉石传说卡组代码:</label>
              <input
                type="text"
                className="w-full p-3 bg-gray-700 border border-purple-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入卡组代码..."
                value={importDeckCodeInput}
                onChange={(e) => setImportDeckCodeInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitImportCode();
                  }
                }}
              />
            </div>
            <div className="flex justify-center gap-6">
              <button 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                onClick={handleSubmitImportCode}
              >
                确定
              </button>
              <button 
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition-colors"
                onClick={() => setShowImportInput(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 