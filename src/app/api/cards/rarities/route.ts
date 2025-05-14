import { NextRequest, NextResponse } from "next/server";

// 获取稀有度列表
export async function GET(req: NextRequest) {
  try {
    // 稀有度ID和中文名称的映射
    const rarityMap = {
      "COMMON": "普通",
      "RARE": "稀有",
      "EPIC": "史诗",
      "LEGENDARY": "传说",
      "FREE": "基本"
    };
    
    // 稀有度的颜色
    const rarityColors = {
      "COMMON": "#FFFFFF", // 白色
      "RARE": "#0070DD", // 蓝色
      "EPIC": "#A335EE", // 紫色
      "LEGENDARY": "#FF8000", // 橙色
      "FREE": "#D3D3D3" // 浅灰色
    };
    
    const rarities = Object.entries(rarityMap).map(([id, name]) => ({
      id,
      name,
      color: rarityColors[id as keyof typeof rarityColors] || "#808080"
    }));
    
    return NextResponse.json({
      success: true,
      data: rarities,
    });
  } catch (error) {
    console.error("获取稀有度列表失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "获取稀有度列表失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 