import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

// 需要先运行npx prisma db push以应用schema变更

// 创建一个API端点用于从HearthstoneJSON更新卡牌数据
export async function POST(req: NextRequest) {
  try {
    // 为了避免类型错误，需要先运行 npx prisma db push 或 npx prisma migrate dev
    type UpdateLog = {
      id: number;
      updateType: string;
      status: string;
      message: string | null;
      cardCount: number | null;
      createdAt: Date;
      updatedAt: Date;
    };

    // 开始记录数据更新
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const updateLog = await db.dataUpdateLog.create({
      data: {
        updateType: "cards",
        status: "started",
        message: "开始从HearthstoneJSON获取卡牌数据",
      },
    }) as UpdateLog;

    // 从HearthstoneJSON API获取最新数据
    const apiUrl = "https://api.hearthstonejson.com/v1/latest/zhCN/cards.json";
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`API请求失败：${response.status} ${response.statusText}`);
    }

    // 解析JSON数据
    const cardsData = await response.json();
    
    // 仅保留可收藏卡牌
    const collectibleCards = cardsData.filter((card: any) => card.collectible);
    
    // 统计每个扩展包的卡牌数量
    const setCount: Record<string, number> = {};
    for (const card of collectibleCards) {
      if (card.set) {
        setCount[card.set] = (setCount[card.set] || 0) + 1;
      }
    }

    // 更新卡牌集合表
    for (const [setId, count] of Object.entries(setCount)) {
      // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
      await db.cardSet.upsert({
        where: { id: setId },
        update: {
          cardCount: count,
          updatedAt: new Date(),
        },
        create: {
          id: setId,
          name: setId, // 可以后续手动更新为中文名称
          cardCount: count,
        },
      });
    }

    // 更新或创建卡牌
    let processedCards = 0;
    for (const card of collectibleCards) {
      // 跳过没有id或dbfId的卡牌
      if (!card.id || !card.dbfId) continue;

      // 处理数组字段为JSON字符串
      const mechanics = card.mechanics ? JSON.stringify(card.mechanics) : null;
      const races = card.races ? JSON.stringify(card.races) : null;
      const referencedTags = card.referencedTags ? JSON.stringify(card.referencedTags) : null;
      const runeCost = card.runeCost ? JSON.stringify(card.runeCost) : null;

      // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
      await db.card.upsert({
        where: { id: card.id },
        update: {
          name: card.name || "",
          cardType: card.type || null,
          cardSet: card.set || "UNKNOWN",
          rarity: card.rarity || null,
          cardClass: card.cardClass || "NEUTRAL",
          cost: card.cost !== undefined ? card.cost : null,
          attack: card.attack !== undefined ? card.attack : null,
          health: card.health !== undefined ? card.health : null,
          text: card.text || null,
          flavor: card.flavor || null,
          artist: card.artist || null,
          collectible: Boolean(card.collectible),
          // 新增字段
          mechanics: mechanics,
          race: card.race || null,
          races: races,
          spellSchool: card.spellSchool || null,
          elite: card.elite !== undefined ? Boolean(card.elite) : null,
          referencedTags: referencedTags,
          runeCost: runeCost,
          updatedAt: new Date(),
        },
        create: {
          id: card.id,
          dbfId: card.dbfId,
          name: card.name || "",
          cardType: card.type || null,
          cardSet: card.set || "UNKNOWN",
          rarity: card.rarity || null,
          cardClass: card.cardClass || "NEUTRAL",
          cost: card.cost !== undefined ? card.cost : null,
          attack: card.attack !== undefined ? card.attack : null,
          health: card.health !== undefined ? card.health : null,
          text: card.text || null,
          flavor: card.flavor || null,
          artist: card.artist || null,
          collectible: Boolean(card.collectible),
          // 新增字段
          mechanics: mechanics,
          race: card.race || null,
          races: races,
          spellSchool: card.spellSchool || null,
          elite: card.elite !== undefined ? Boolean(card.elite) : null,
          referencedTags: referencedTags,
          runeCost: runeCost,
        },
      });
      processedCards++;
    }

    // 更新日志状态
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    await db.dataUpdateLog.update({
      where: { id: updateLog.id },
      data: {
        status: "completed",
        message: `成功更新 ${processedCards} 张卡牌数据`,
        cardCount: processedCards,
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功更新 ${processedCards} 张卡牌数据`,
      sets: Object.keys(setCount).length,
      cards: processedCards,
    });
  } catch (error) {
    console.error("更新卡牌数据失败:", error);
    
    // 记录错误
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    await db.dataUpdateLog.create({
      data: {
        updateType: "cards",
        status: "failed",
        message: `更新失败: ${error instanceof Error ? error.message : String(error)}`,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: "更新卡牌数据失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 