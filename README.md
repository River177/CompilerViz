# CompilerViz - 编译原理语法分析可视化工具

CompilerViz 是一个交互式的 Web 应用程序，旨在帮助学生和开发者直观地理解编译原理中的语法分析算法。通过可视化的方式，展示了从文法定义到构建分析表的完整过程。

## ✨ 主要功能

*   **自定义文法输入**：支持用户输入自定义的上下文无关文法（CFG）。
*   **First & Follow 集合计算**：自动计算并展示所有非终结符的 First 和 Follow 集合。
*   **LL(1) 分析**：
    *   构建并展示 LL(1) 预测分析表。
*   **LR 分析系列**：
    *   **LR(0)**：展示 LR(0) 项目集规范族及分析表。
    *   **SLR(1)**：展示 SLR(1) 分析表。
    *   **LR(1)**：支持更强大的 LR(1) 分析算法及状态机可视化。

## 🛠️ 技术栈

*   **核心框架**：[React](https://react.dev/) (v19)
*   **构建工具**：[Vite](https://vitejs.dev/)
*   **语言**：[TypeScript](https://www.typescriptlang.org/)
*   **样式**：[Tailwind CSS](https://tailwindcss.com/) (v4)

## 🚀 快速开始

### 1. 环境准备
确保您的本地环境已安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本)。

### 2. 安装依赖
在项目根目录下运行以下命令安装依赖：

```bash
npm install
# 或者使用 pnpm
pnpm install
```

### 3. 启动开发服务器
启动本地开发环境：

```bash
npm run dev
# 或者
pnpm dev
```
浏览器将自动打开 `http://localhost:3000` (或终端显示的端口)。

### 4. 构建生产版本
构建用于生产环境的静态文件：

```bash
npm run build
```
构建产物将位于 `dist/` 目录下。

## 📝 示例

默认加载了一个简单的表达式文法：

```
E -> E + T | T
T -> T * F | F
F -> ( E ) | id
```

您可以随时修改文法并点击 "Build Visualizations" 来生成新的分析结果。
