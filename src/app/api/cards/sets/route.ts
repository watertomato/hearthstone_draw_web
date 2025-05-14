import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

// 获取扩展包列表
export async function GET(req: NextRequest) {
  try {
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const sets = await db.cardSet.findMany({
      orderBy: {
        cardCount: "desc",
      },
    });
    
    return NextResponse.json({
      success: true,
      data: sets,
    });
  } catch (error) {
    console.error("获取扩展包列表失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "获取扩展包列表失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 