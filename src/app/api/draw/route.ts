import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

// 稀有度概率配置
const RARITY_PROBABILITIES = {
  "COMMON": 0.7162,
  "RARE": 0.2266,
  "EPIC": 0.0448,
  "LEGENDARY": 0.0124,
};

// 保底机制配置
const GUARANTEE_RARE_OR_HIGHER = true; // 每包至少一张稀有或更高
const LEGENDARY_PITY_TIMER = 40; // 40包传说保底

// 稀有度分析器
class PackRarityAnalyzer {
  rarityProbabilities: Record<string, number>;
  guaranteeRareOrHigher: boolean;
  
  constructor(rarityProbabilities = RARITY_PROBABILITIES, guaranteeRareOrHigher = GUARANTEE_RARE_OR_HIGHER) {
    this.rarityProbabilities = rarityProbabilities;
    this.guaranteeRareOrHigher = guaranteeRareOrHigher;
  }
  
  // 确定一个卡包中5张卡的稀有度
  determinePackRarities(guaranteedLegendary = false): string[] {
    const rarities: string[] = [];
    
    // 先抽取前4张卡
    for (let i = 0; i < 4; i++) {
      const rarityItems = Object.entries(this.rarityProbabilities);
      const raritiesList = rarityItems.map(r => r[0]);
      const weights = rarityItems.map(r => r[1]);
      
      const selectedRarity = this.weightedRandom(raritiesList, weights);
      rarities.push(selectedRarity);
    }
    
    // 检查前4张卡中是否已经有传说
    const hasLegendary = rarities.includes('LEGENDARY');
    // 检查前4张卡中是否已经有稀有及以上的卡
    const hasRareOrHigher = rarities.some(r => ['LEGENDARY', 'EPIC', 'RARE'].includes(r));
    
    // 决定最后一张卡的稀有度
    if (guaranteedLegendary && !hasLegendary) {
      // 如果需要保底传说且还没抽到传说，最后一张必定是传说
      rarities.push('LEGENDARY');
    } else if (this.guaranteeRareOrHigher && !hasRareOrHigher) {
      // 如果需要保底稀有且还没抽到稀有或更高，从稀有及以上随机抽取
      const higherRarities = ['LEGENDARY', 'EPIC', 'RARE'];
      const weights = higherRarities.map(r => this.rarityProbabilities[r] || 0);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      
      if (totalWeight > 0) {
        const normalizedWeights = weights.map(w => w / totalWeight);
        const selectedRarity = this.weightedRandom(higherRarities, normalizedWeights);
        rarities.push(selectedRarity);
      } else {
        // 在极端情况下，直接添加RARE
        rarities.push('RARE');
      }
    } else {
      // 正常抽取
      const rarityItems = Object.entries(this.rarityProbabilities);
      const raritiesList = rarityItems.map(r => r[0]);
      const weights = rarityItems.map(r => r[1]);
      
      const selectedRarity = this.weightedRandom(raritiesList, weights);
      rarities.push(selectedRarity);
    }
    
    return rarities;
  }
  
  // 加权随机选择
  weightedRandom(items: string[], weights: number[]): string {
    if (items.length === 0) return '';
    
    const cumulativeWeights: number[] = [];
    let sum = 0;
    
    for (const weight of weights) {
      sum += weight;
      cumulativeWeights.push(sum);
    }
    
    const random = Math.random() * sum;
    
    for (let i = 0; i < items.length && i < cumulativeWeights.length; i++) {
      const cumWeight = cumulativeWeights[i];
      if (cumWeight !== undefined && random < cumWeight && items[i]) {
        return items[i] as string;
      }
    }
    
    // 如果上面的逻辑没有返回结果，确保返回有效的字符串
    const lastIndex = items.length - 1;
    return lastIndex >= 0 && items[lastIndex] ? items[lastIndex] as string : '';
  }
}

// 抽卡模拟器
class PackSimulator {
  cards: Map<string, any[]>; // 按扩展包存储的卡牌集合
  cardsByRarity: Map<string, Map<string, any[]>>; // 按扩展包和稀有度存储的卡牌集合
  rarityAnalyzer: PackRarityAnalyzer;
  pityCounter: Map<string, number>; // 每个扩展包的保底计数器
  openedLegendaries: Map<string, Set<string>>; // 记录已抽到的传说卡
  firstLegendaryObtained: Map<string, boolean>; // 记录每个扩展包是否已经抽到第一张传说
  packsOpened: Map<string, number>; // 记录每个扩展包已抽取的包数（用于前10包保底）
  
  constructor() {
    this.cards = new Map();
    this.cardsByRarity = new Map();
    this.rarityAnalyzer = new PackRarityAnalyzer();
    this.pityCounter = new Map();
    this.openedLegendaries = new Map();
    this.firstLegendaryObtained = new Map();
    this.packsOpened = new Map();
  }
  
  // 加载特定扩展包的卡牌数据
  async loadCardData(setId: string) {
    if (this.cards.has(setId)) {
      return; // 已加载过此扩展包数据
    }
    
    // 从数据库加载卡牌
    const cards = await db.card.findMany({
      where: {
        cardSet: setId,
        collectible: true,
      },
    });
    
    if (cards.length === 0) {
      throw new Error(`扩展包 ${setId} 没有可用卡牌数据`);
    }
    
    // 存储扩展包的所有卡牌
    this.cards.set(setId, cards);
    
    // 按稀有度分类卡牌
    const cardsByRarity = new Map<string, any[]>();
    for (const card of cards) {
      const rarity = card.rarity || 'COMMON';
      if (!cardsByRarity.has(rarity)) {
        cardsByRarity.set(rarity, []);
      }
      const rarityCards = cardsByRarity.get(rarity);
      if (rarityCards) {
        rarityCards.push(card);
      }
    }
    
    this.cardsByRarity.set(setId, cardsByRarity);
    
    // 初始化保底计数器和已开包数
    this.pityCounter.set(setId, 0);
    this.firstLegendaryObtained.set(setId, false);
    this.packsOpened.set(setId, 0);
    this.openedLegendaries.set(setId, new Set());
  }
  
  // 模拟单个卡包的抽卡过程
  simulatePackOpening(setId: string) {
    if (!this.cardsByRarity.has(setId)) {
      throw new Error(`扩展包 ${setId} 的数据未加载`);
    }
    
    // 获取扩展包已开包数，并增加计数
    const currentPacksOpened = this.packsOpened.get(setId) || 0;
    this.packsOpened.set(setId, currentPacksOpened + 1);
    
    // 保底机制处理
    let guaranteedLegendary = false;
    
    // 前10包保底逻辑：如果未抽到传说且当前是第10包，强制出传说
    if (!(this.firstLegendaryObtained.get(setId) || false) && (currentPacksOpened + 1) === 10) {
      guaranteedLegendary = true;
    } 
    // 每40包保底逻辑：仅在已经抽到第一张传说后生效
    else if (this.firstLegendaryObtained.get(setId) || false) {
      const currentPityCounter = (this.pityCounter.get(setId) || 0) + 1;
      this.pityCounter.set(setId, currentPityCounter);
      
      if (currentPityCounter >= LEGENDARY_PITY_TIMER) {
        guaranteedLegendary = true;
        this.pityCounter.set(setId, 0);
      }
    }
    
    // 确定卡包中5张卡的稀有度
    const rarities = this.rarityAnalyzer.determinePackRarities(guaranteedLegendary);
    
    // 抽取卡牌
    const cards = [];
    for (const rarity of rarities) {
      const card = this.drawCardOfRarity(setId, rarity);
      cards.push(card);
      
      // 如果抽到了传说卡
      if (card.rarity === 'LEGENDARY') {
        // 记录已抽到的传说卡
        const openedLegendaries = this.openedLegendaries.get(setId);
        if (openedLegendaries) {
          openedLegendaries.add(card.id);
        }
        
        // 记录已获得第一张传说
        if (!(this.firstLegendaryObtained.get(setId) || false)) {
          this.firstLegendaryObtained.set(setId, true);
          // 重置保底计数器
          this.pityCounter.set(setId, 0);
        } else {
          // 已经抽到过传说，正常重置40包保底计数
          this.pityCounter.set(setId, 0);
        }
      }
    }
    
    return cards;
  }
  
  // 抽取指定稀有度的卡牌
  drawCardOfRarity(setId: string, rarity: string) {
    const cardsByRarity = this.cardsByRarity.get(setId);
    if (!cardsByRarity) {
      throw new Error(`扩展包 ${setId} 的数据未加载`);
    }
    
    const availableCards = cardsByRarity.get(rarity) || [];
    
    // 如果没有该稀有度的卡牌
    if (availableCards.length === 0) {
      // 尝试使用更高稀有度
      for (const higherRarity of ['LEGENDARY', 'EPIC', 'RARE', 'COMMON']) {
        const higherCards = cardsByRarity.get(higherRarity) || [];
        if (higherCards.length > 0) {
          return this.getRandomCard(higherCards);
        }
      }
      // 如果实在没有卡牌，直接返回扩展包的随机一张
      const allCards = this.cards.get(setId) || [];
      return this.getRandomCard(allCards);
    }
    
    // 对传说卡进行特殊处理
    if (rarity === 'LEGENDARY') {
      const allLegendaries = availableCards;
      if (allLegendaries.length === 0) {
        // 如果没有传说卡，返回随机一张史诗
        const epicCards = cardsByRarity.get('EPIC') || [];
        if (epicCards.length > 0) {
          return this.getRandomCard(epicCards);
        }
        // 如果没有史诗卡，返回随机一张卡
        const allCards = this.cards.get(setId) || [];
        return this.getRandomCard(allCards);
      }
      
      // 已抽到的传说卡ID集合
      const openedLegendaryIds = this.openedLegendaries.get(setId) || new Set<string>();
      
      // 检查是否已抽到所有传说卡
      if (openedLegendaryIds.size >= allLegendaries.length) {
        // 如果已抽到所有传说，随机抽取一张
        return this.getRandomCard(allLegendaries);
      } else {
        // 否则只能抽还没抽到过的传说
        const unopenedLegendaries = allLegendaries.filter(
          card => !openedLegendaryIds.has(card.id)
        );
        if (unopenedLegendaries.length > 0) {
          return this.getRandomCard(unopenedLegendaries);
        } else {
          // 理论上不应该到这里，但以防万一
          return this.getRandomCard(allLegendaries);
        }
      }
    } else {
      // 非传说卡正常抽取
      return this.getRandomCard(availableCards);
    }
  }
  
  // 从卡牌数组中随机抽取一张
  getRandomCard(cards: any[]) {
    const index = Math.floor(Math.random() * cards.length);
    return cards[index];
  }
  
  // 重置模拟器状态
  reset() {
    this.pityCounter = new Map();
    this.openedLegendaries = new Map();
    this.firstLegendaryObtained = new Map();
    this.packsOpened = new Map();
    
    // 重新初始化已加载的扩展包
    for (const setId of this.cards.keys()) {
      this.pityCounter.set(setId, 0);
      this.firstLegendaryObtained.set(setId, false);
      this.packsOpened.set(setId, 0);
      this.openedLegendaries.set(setId, new Set<string>());
    }
  }
}

// API参数验证
const drawParamsSchema = z.object({
  setId: z.string().min(1).max(50),
  count: z.coerce.number().int().min(1).max(500),
});

// API处理函数
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    // 验证参数
    const result = drawParamsSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "参数无效",
          message: result.error.message,
        },
        { status: 400 }
      );
    }
    
    const { setId, count } = result.data;
    
    // 验证扩展包是否存在
    const cardSet = await db.cardSet.findUnique({
      where: { id: setId },
    });
    
    if (!cardSet) {
      return NextResponse.json(
        {
          success: false,
          error: "扩展包不存在",
        },
        { status: 404 }
      );
    }
    
    // 创建模拟器并加载卡牌数据
    const simulator = new PackSimulator();
    await simulator.loadCardData(setId);
    
    // 模拟抽卡
    const results = [];
    for (let i = 0; i < count; i++) {
      const cards = simulator.simulatePackOpening(setId);
      
      // 统计本包稀有度分布
      const rarityDistribution = {
        COMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
      };
      
      // 处理卡牌数据，增加必要信息
      const processedCards = cards.map(card => {
        // 更新稀有度统计
        const rarity = card.rarity || 'COMMON';
        if (rarity in rarityDistribution) {
          rarityDistribution[rarity as keyof typeof rarityDistribution]++;
        }
        
        // 转换数组类型的字段
        return {
          ...card,
          // 解析JSON格式的字段
          mechanics: card.mechanics ? JSON.parse(card.mechanics) : null,
          races: card.races ? JSON.parse(card.races) : null,
          referencedTags: card.referencedTags ? JSON.parse(card.referencedTags) : null,
          runeCost: card.runeCost ? JSON.parse(card.runeCost) : null,
        };
      });
      
      results.push({
        packId: i + 1,
        cards: processedCards,
        rarityDistribution
      });
    }
    
    // 返回抽卡结果
    return NextResponse.json({
      success: true,
      data: {
        setId,
        setName: cardSet.name,
        packsOpened: count,
        totalCards: count * 5,
        packs: results,
        // 汇总稀有度统计
        totalRarityDistribution: results.reduce((acc, pack) => {
          Object.entries(pack.rarityDistribution).forEach(([rarity, count]) => {
            acc[rarity] = (acc[rarity] || 0) + count;
          });
          return acc;
        }, {} as Record<string, number>),
      }
    });
    
  } catch (error) {
    console.error("抽卡模拟出错:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "抽卡模拟失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 