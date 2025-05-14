import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";

const cardQuerySchema = z.object({
  class: z.string().optional(), // 职业
  set: z.string().optional(), // 扩展包
  rarity: z.string().optional(), // 稀有度
  cost: z.string().optional(), // 费用
  search: z.string().optional(), // 搜索关键词
  page: z.string().optional(), // 页码
  limit: z.string().optional(), // 每页数量
});

// 获取卡牌列表
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    
    // 解析查询参数
    const result = cardQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "查询参数无效", details: result.error },
        { status: 400 }
      );
    }
    
    const { 
      class: cardClass,
      set: cardSet,
      rarity,
      cost,
      search,
      page = "1",
      limit = "20"
    } = result.data;
    
    // 构建过滤条件
    const where: any = { collectible: true };
    
    if (cardClass) {
      where.cardClass = cardClass;
    }
    
    if (cardSet) {
      where.cardSet = cardSet;
    }
    
    if (rarity) {
      where.rarity = rarity;
    }
    
    if (cost) {
      const costValue = parseInt(cost);
      if (!isNaN(costValue)) {
        // 处理"8+"的情况
        if (cost.endsWith("+")) {
          where.cost = { gte: parseInt(cost) };
        } else {
          where.cost = costValue;
        }
      }
    }
    
    if (search) {
      where.name = { contains: search };
    }
    
    // 分页参数
    const pageNumber = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNumber - 1) * pageSize;
    
    // 查询卡牌
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const cards = await db.card.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { cost: "asc" },
        { name: "asc" }
      ],
    });
    
    // 获取总数
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const total = await db.card.count({ where });
    
    return NextResponse.json({
      success: true,
      data: {
        cards,
        pagination: {
          page: pageNumber,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    console.error("获取卡牌数据失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "获取卡牌数据失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 