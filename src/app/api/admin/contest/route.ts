import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 获取所有比赛
export async function GET() {
  try {
    // 获取比赛列表，包括关联的卡包
    const contests = await prisma.contest.findMany({
      include: {
        packs: true
      },
      orderBy: {
        startDateTime: 'asc'
      }
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

// 创建新比赛
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, startDateTime, endDateTime, location, status, maxParticipants, currentParticipants, registrationLink, description, packs } = data;

    // 验证必填字段
    if (!name || !startDateTime || !endDateTime || !location || !status || !maxParticipants) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 创建比赛及关联的卡包
    const contest = await prisma.contest.create({
      data: {
        name,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        location,
        status,
        maxParticipants: Number(maxParticipants),
        currentParticipants: Number(currentParticipants || 0),
        registrationLink,
        description,
        packs: {
          create: packs.map((pack: { name: string; count: number }) => ({
            name: pack.name,
            count: Number(pack.count)
          }))
        }
      },
      include: {
        packs: true
      }
    });

    revalidatePath('/contest');
    revalidatePath('/admin/contest');

    return NextResponse.json({
      success: true,
      data: { contest }
    }, { status: 201 });
  } catch (error) {
    console.error('创建比赛失败:', error);
    return NextResponse.json(
      { success: false, message: '创建比赛失败' },
      { status: 500 }
    );
  }
}

// 更新比赛
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, name, startDateTime, endDateTime, location, status, maxParticipants, currentParticipants, registrationLink, description, packs } = data;

    // 验证必填字段
    if (!id || !name || !startDateTime || !endDateTime || !location || !status || !maxParticipants) {
      return NextResponse.json(
        { success: false, message: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 先删除原有的卡包
    await prisma.pack.deleteMany({
      where: {
        contestId: id
      }
    });

    // 更新比赛信息并创建新的卡包
    const contest = await prisma.contest.update({
      where: {
        id
      },
      data: {
        name,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        location,
        status,
        maxParticipants: Number(maxParticipants),
        currentParticipants: Number(currentParticipants || 0),
        registrationLink,
        description,
        packs: {
          create: packs.map((pack: { name: string; count: number }) => ({
            name: pack.name,
            count: Number(pack.count)
          }))
        }
      },
      include: {
        packs: true
      }
    });

    revalidatePath('/contest');
    revalidatePath('/admin/contest');

    return NextResponse.json({
      success: true,
      data: { contest }
    });
  } catch (error) {
    console.error('更新比赛失败:', error);
    return NextResponse.json(
      { success: false, message: '更新比赛失败' },
      { status: 500 }
    );
  }
}

// 删除比赛
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少比赛ID' },
        { status: 400 }
      );
    }

    // 删除比赛 (由于设置了onDelete: Cascade，卡包会自动删除)
    await prisma.contest.delete({
      where: {
        id
      }
    });

    revalidatePath('/contest');
    revalidatePath('/admin/contest');

    return NextResponse.json({
      success: true,
      message: '比赛已成功删除'
    });
  } catch (error) {
    console.error('删除比赛失败:', error);
    return NextResponse.json(
      { success: false, message: '删除比赛失败' },
      { status: 500 }
    );
  }
} 