import { NextResponse } from "next/server";
import { db } from "~/server/db";

// 获取核心(CORE)和活动(EVENT)包的卡牌数据
export async function GET() {
  try {
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const cards = await db.card.findMany({
      where: {
        cardSet: {
          in: ['CORE', 'EVENT']
        },
        collectible: true
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
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        cards,
        totalCount: cards.length
      }
    });
  } catch (error) {
    console.error("获取核心和活动包卡牌失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "获取核心和活动包卡牌失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 