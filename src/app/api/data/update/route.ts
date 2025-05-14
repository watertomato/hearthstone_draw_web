import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

// 获取数据更新日志
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    
    // @ts-ignore - 忽略因为数据库模型尚未生成而导致的类型错误
    const logs = await db.dataUpdateLog.findMany({
      take: Math.min(50, Math.max(1, limit)),
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("获取更新日志失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "获取更新日志失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 