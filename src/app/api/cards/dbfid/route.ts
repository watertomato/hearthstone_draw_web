import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

const dbfIdQuerySchema = z.object({
  ids: z.string(), // 逗号分隔的DBF ID列表
});

// 根据DBF ID批量获取卡牌信息
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    
    // 解析查询参数
    const result = dbfIdQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "查询参数无效，请提供ids参数", details: result.error },
        { status: 400 }
      );
    }
    
    const { ids } = result.data;
    
    // 分割并过滤DBF ID列表
    const dbfIds = ids.split(',')
      .filter(id => id.trim().length > 0)
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));
    
    if (dbfIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "未提供有效的DBF ID" },
        { status: 400 }
      );
    }
    
    // 限制一次查询的数量
    const maxBatchSize = 100;
    if (dbfIds.length > maxBatchSize) {
      return NextResponse.json(
        { success: false, error: `一次最多查询${maxBatchSize}个DBF ID` },
        { status: 400 }
      );
    }
    
    // 批量查询卡牌信息
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const cards = await db.card.findMany({
      where: {
        dbfId: {
          in: dbfIds
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
        runeCost: true,
        dbfId: true,
      }
    });
    
    // 创建DBF ID到卡牌信息的映射
    const dbfIdToCardMap = cards.reduce((acc, card) => {
      if (card.dbfId !== undefined) {
        acc[card.dbfId] = card;
      }
      return acc;
    }, {} as Record<number, any>);
    
    // 检查是否有未找到的DBF ID
    const missingDbfIds = dbfIds.filter(dbfId => !dbfIdToCardMap[dbfId]);
    
    return NextResponse.json({
      success: true,
      data: {
        cards,
        dbfIdToCardMap,
        missingDbfIds,
        totalFound: cards.length,
        totalRequested: dbfIds.length
      }
    });
  } catch (error) {
    console.error("根据DBF ID获取卡牌信息失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "根据DBF ID获取卡牌信息失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 