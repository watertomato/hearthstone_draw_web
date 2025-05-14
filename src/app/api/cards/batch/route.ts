import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

const cardBatchQuerySchema = z.object({
  ids: z.string(), // 逗号分隔的卡牌ID列表
});

// 批量获取卡牌信息
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    
    // 解析查询参数
    const result = cardBatchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "查询参数无效，请提供ids参数", details: result.error },
        { status: 400 }
      );
    }
    
    const { ids } = result.data;
    
    // 分割并过滤ID列表
    const cardIds = ids.split(',').filter(id => id.trim().length > 0);
    
    if (cardIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "未提供有效的卡牌ID" },
        { status: 400 }
      );
    }
    
    // 限制一次查询的数量
    const maxBatchSize = 100;
    if (cardIds.length > maxBatchSize) {
      return NextResponse.json(
        { success: false, error: `一次最多查询${maxBatchSize}张卡牌` },
        { status: 400 }
      );
    }
    
    // 批量查询卡牌信息
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const cards = await db.card.findMany({
      where: {
        id: {
          in: cardIds
        }
      },
      select: {
        id: true,
        name: true,
        cardClass: true,
        cardSet: true,
        rarity: true,
        cost: true,
        attack: true,
        health: true,
        text: true,
        cardType: true,
        mechanics: true,
        race: true,
        races: true,
        spellSchool: true,
      }
    });
    
    // 创建一个ID到卡牌信息的映射
    const cardMap = cards.reduce((acc, card) => {
      acc[card.id] = card;
      return acc;
    }, {} as Record<string, any>);
    
    // 检查是否有未找到的卡牌ID
    const missingCardIds = cardIds.filter(id => !cardMap[id]);
    
    return NextResponse.json({
      success: true,
      data: {
        cards,
        cardMap,
        missingCardIds,
        totalFound: cards.length,
        totalRequested: cardIds.length
      }
    });
  } catch (error) {
    console.error("批量获取卡牌信息失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "批量获取卡牌信息失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 