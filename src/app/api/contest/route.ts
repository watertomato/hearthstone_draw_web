import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 获取所有比赛
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    // 构建查询条件
    const where = status && status !== 'all' ? { status } : {};
    
    // 获取比赛列表，包括关联的卡包
    const contests = await prisma.contest.findMany({
      where,
      include: {
        packs: true
      },
      orderBy: [
        { status: 'asc' }, // 先按状态排序：进行中 > 即将开始 > 已结束
        { startDateTime: 'asc' } // 同一状态下按开始时间排序
      ]
    });

    return NextResponse.json({
      success: true,
      data: { contests }
    });
  } catch (error) {
    console.error('获取比赛列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取比赛列表失败' },
      { status: 500 }
    );
  }
} 