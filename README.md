# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

# 炉石传说辅助工具

这是一个基于Next.js的炉石传说辅助工具，包含抽卡模拟和卡组构建功能。

## 功能特点

- 抽卡模拟：模拟炉石传说卡包抽取过程，计算稀有卡牌的获取概率
- 卡组构建：创建和管理炉石传说卡组，分析卡组强度

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- Prisma ORM
- MySQL数据库

## 数据库设置

项目使用Prisma ORM管理MySQL数据库。数据库主要存储以下内容：

1. 卡牌数据：包含所有炉石传说卡牌的详细信息
2. 扩展包数据：各个版本的扩展包信息
3. 数据更新日志：记录数据更新的时间和结果

### 数据库迁移

```bash
# 创建Prisma迁移
npx prisma migrate dev --name add_hearthstone_cards

# 或者直接应用Schema变更
npx prisma db push
```

### 数据库模型

主要数据模型包括：

- Card：卡牌信息
- CardSet：扩展包信息
- DataUpdateLog：数据更新日志

## 数据更新

系统通过调用HearthstoneJSON API获取最新的卡牌数据，并存储到数据库中。

### 手动更新数据

访问管理页面 `/admin/update-cards` 可以手动触发卡牌数据更新。

### API接口

项目提供以下API接口：

- `/api/cards/update` - 更新卡牌数据
- `/api/cards` - 获取卡牌列表，支持筛选
- `/api/cards/sets` - 获取扩展包列表
- `/api/cards/classes` - 获取职业列表
- `/api/cards/rarities` - 获取稀有度列表
- `/api/data/update` - 获取数据更新日志

## 入门指南

1. 克隆仓库
2. 安装依赖: `npm install`
3. 复制.env.example到.env并配置数据库连接
4. 执行数据库迁移: `npx prisma migrate dev`
5. 运行开发服务器: `npm run dev`
6. 访问管理页面更新卡牌数据: `http://localhost:3000/admin/update-cards`

## 系统功能

### 炉石传说卡组构建器

卡组构建器允许用户：

1. 导入卡牌收藏数据
2. 根据职业、费用和稀有度筛选卡牌
3. 构建30张卡牌的标准模式卡组
4. 导入/导出炉石传说卡组代码
5. 查看卡牌详细信息

特别功能：
- 支持通过DBF ID查询卡牌信息，解决卡组代码导入问题
- 导入卡组时自动识别职业并处理边界情况
- 支持传说卡最多1张、其他卡牌最多2张的规则限制
- 支持缺失卡牌的友好提示和报告
- 简化的卡组导入/导出逻辑，直接通过API查询卡牌DBF ID，提高可靠性
