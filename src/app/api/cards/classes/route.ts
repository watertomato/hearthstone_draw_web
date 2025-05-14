import { NextRequest, NextResponse } from "next/server";

// 获取职业列表
export async function GET(req: NextRequest) {
  try {
    // 职业ID和中文名称的映射
    const classMap = {
      "DEATHKNIGHT": "死亡骑士",
      "DEMONHUNTER": "恶魔猎手",
      "DRUID": "德鲁伊",
      "HUNTER": "猎人",
      "MAGE": "法师",
      "PALADIN": "圣骑士",
      "PRIEST": "牧师",
      "ROGUE": "潜行者",
      "SHAMAN": "萨满",
      "WARLOCK": "术士",
      "WARRIOR": "战士",
      "NEUTRAL": "中立"
    };
    
    // 职业的颜色
    const classColors = {
      "DEATHKNIGHT": "#91A3B0", // 蓝灰色
      "DEMONHUNTER": "#A330C9", // 紫色
      "DRUID": "#FF7D0A", // 橙色
      "HUNTER": "#ABD473", // 绿色
      "MAGE": "#69CCF0", // 蓝色
      "PALADIN": "#F58CBA", // 粉色
      "PRIEST": "#FFFFFF", // 白色
      "ROGUE": "#FFF569", // 黄色
      "SHAMAN": "#0070DE", // 蓝色
      "WARLOCK": "#9482C9", // 紫色
      "WARRIOR": "#C79C6E", // 棕色
      "NEUTRAL": "#808080" // 灰色
    };
    
    const classes = Object.entries(classMap).map(([id, name]) => ({
      id,
      name,
      color: classColors[id as keyof typeof classColors] || "#808080"
    }));
    
    return NextResponse.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("获取职业列表失败:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "获取职业列表失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 