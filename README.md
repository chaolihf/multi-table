# Multi-Table 多维表格应用

一个基于 React + Canvas 的高性能在线协作表格编辑工具。

## 功能特性

### ✅ 已实现功能

#### 核心编辑
- 📊 **Canvas 渲染引擎** - 支持 1000+ 行 × 50+ 列流畅渲染
- 🖱️ **单元格操作** - 选择、编辑、复制、粘贴、剪切、删除
- ⌨️ **键盘快捷键** - Ctrl+C/V/X、方向键导航、Enter/Tab 移动
- 📋 **右键菜单** - 快速访问常用操作
- ➕ **插入/删除行列** - 灵活的表格结构调整
- 🔢 **公式引擎** - 支持 SUM、AVERAGE、IF 等常用函数
- 🔗 **依赖追踪** - 公式自动重算
- ⚠️ **错误检测** - 循环引用、除零错误等

#### 数据管理
- 💾 **本地持久化** - 自动保存到 localStorage
- 🔄 **数据恢复** - 刷新页面不丢失数据

#### 实时协作
- 🌐 **WebSocket 通信** - 实时同步编辑操作
- 👥 **多用户编辑** - 支持多人同时编辑
- 🔄 **OT 算法** - 冲突解决和最终一致性
- 📍 **用户感知** - 在线用户列表
- 🔌 **自动重连** - 网络断开后自动恢复

#### 权限控制
- 🔐 **RBAC 模型** - 管理员、编辑者、查看者
- 📁 **区域权限** - 细粒度单元格区域访问控制
- ✅ **权限检查** - 服务端和客户端双重验证

### 🚧 待实现功能

- 填充手柄（拖动自动填充）
- VLOOKUP、HLOOKUP 等查找函数
- 权限配置 UI
- 撤销/重做
- 导入/导出 Excel
- 移动端支持

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

#### 1. 前端应用

```bash
cd multi-table-app
npm install
npm run dev
```

访问 http://localhost:5173

#### 2. WebSocket 服务器（协作功能）

```bash
cd multi-table-server
npm install
npm run dev
```

服务器运行在 ws://localhost:8080

### 构建

```bash
# 前端构建
cd multi-table-app
npm run build

# 服务器构建
cd multi-table-server
npm run build
npm start
```

### 测试

```bash
cd multi-table-app
npm run test:run
```

## 项目结构

```
multi-table/
├── multi-table-app/          # 前端应用
│   ├── src/
│   │   ├── components/       # React 组件
│   │   │   ├── CanvasRenderer/   # Canvas 渲染
│   │   │   ├── ContextMenu/      # 右键菜单
│   │   │   ├── Toolbar/          # 工具栏
│   │   │   ├── Collaborators/    # 协作者列表
│   │   │   └── PermissionDialog/ # 权限对话框
│   │   ├── hooks/            # React Hooks
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   └── useWebSocket.ts
│   │   ├── store/            # Zustand 状态管理
│   │   ├── utils/            # 工具函数
│   │   │   ├── formula.ts        # 公式引擎
│   │   │   ├── clipboard.ts      # 剪贴板操作
│   │   │   ├── fillHandle.ts     # 填充手柄
│   │   │   └── permissions.ts    # 权限控制
│   │   └── types/            # TypeScript 类型
│   └── package.json
│
├── multi-table-server/       # WebSocket 服务器
│   ├── src/
│   │   └── index.ts          # 协作服务器
│   └── package.json
│
└── openspec/                 # 设计文档
    └── changes/
        └── react-multi-table/
            ├── proposal.md   # 项目提案
            ├── design.md     # 设计文档
            ├── tasks.md      # 任务列表
            └── specs/        # 规格说明
```

## 使用指南

### 公式使用

在单元格中输入 `=` 开头的内容即可创建公式：

```
=SUM(A1:A10)           # 求和
=AVERAGE(B1:B5)        # 平均值
=IF(A1>10, "合格", "不合格")  # 条件判断
=A1+B1*C1              # 四则运算
```

支持的函数：
- 数学：SUM, AVERAGE, MIN, MAX, COUNT, ABS, ROUND, POWER
- 逻辑：IF, AND, OR, NOT, IFERROR
- 文本：CONCATENATE, LEFT, RIGHT, MID, LEN

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+X | 剪切 |
| Delete | 清除内容 |
| 方向键 | 移动选区 |
| Shift+ 方向键 | 扩展选区 |
| Enter | 向下移动 |
| Tab | 向右移动 |
| 双击单元格 | 进入编辑 |

### 协作编辑

1. 启动 WebSocket 服务器
2. 多个用户打开前端应用
3. 所有编辑操作实时同步
4. 绿色圆点表示已连接

## 技术栈

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Zustand** - 状态管理
- **Canvas API** - 高性能渲染
- **Vite** - 构建工具

### 后端
- **Node.js** - 运行时
- **WebSocket** - 实时通信
- **OT 算法** - 操作转换

## API 文档

### WebSocket 消息格式

#### 客户端 → 服务端

```json
{
  "type": "join",
  "payload": {
    "sheetId": "sheet-123",
    "name": "用户名"
  }
}
```

```json
{
  "type": "operation",
  "payload": {
    "type": "SET_CELL",
    "sheetId": "sheet-123",
    "payload": {
      "position": { "row": 0, "col": 0 },
      "value": "Hello"
    }
  }
}
```

#### 服务端 → 客户端

```json
{
  "type": "operation",
  "operation": {
    "id": "op-123",
    "type": "SET_CELL",
    "payload": { ... },
    "timestamp": 1234567890,
    "userId": "user-456"
  }
}
```

## 开发

### 代码规范

```bash
# 格式化代码
npm run format

# Lint 检查
npm run lint
```

### 测试

```bash
npm test
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。
