export function Footer() {
  return (
    <footer className="bg-purple-900/30 py-6 text-center text-white">
      <div className="container mx-auto px-4">
        <p className="text-sm text-gray-300">
          © {new Date().getFullYear()} 炉石传说辅助工具 | 
          非官方应用，仅供学习和娱乐使用
        </p>
        <p className="mt-2 text-xs text-gray-400">
          炉石传说®是暴雪娱乐公司的注册商标。本站与暴雪娱乐没有从属关系。
        </p>
      </div>
    </footer>
  );
} 