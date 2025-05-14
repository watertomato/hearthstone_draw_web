import Link from "next/link";
import { HydrateClient } from "~/trpc/server";

export default function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            炉石传说 <span className="text-[hsl(280,100%,70%)]">辅助工具</span>
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="/draw"
            >
              <h3 className="text-2xl font-bold">抽卡模拟 →</h3>
              <div className="text-lg">
                模拟炉石传说卡包抽取，计算抽取稀有卡牌的概率和成本。
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="/deck"
            >
              <h3 className="text-2xl font-bold">卡组构建 →</h3>
              <div className="text-lg">
                构建和管理您的炉石传说卡组，分析卡组强度和对抗特定元环境的效果。
              </div>
            </Link>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
