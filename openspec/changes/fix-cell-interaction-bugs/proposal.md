## Why

用户报告了 4 个单元格交互的 bug，严重影响基本操作体验：双击无法进入编辑、键盘输入无响应、复制粘贴操作对象错误、行列头选择无效。这些问题使核心功能无法使用，需要立即修复。

## What Changes

- 修复双击单元格进入编辑状态的逻辑
- 修复选中状态切换后键盘输入进入编辑状态的逻辑
- 修复复制、粘贴、插入等操作以选中单元格为基准，而非鼠标位置
- 修复点击行/列标题时正确选中整行/整列

## Capabilities

### New Capabilities

无新增功能，仅修复现有交互逻辑。

### Modified Capabilities

- `cell-operations`: 修复选择逻辑、编辑触发条件、操作基准点

## Impact

- `CanvasRenderer.tsx`: 事件处理逻辑（双击、键盘输入、右键菜单）
- `sheetStore.ts`: 选择状态管理
- `ContextMenu.tsx`: 右键菜单操作基准
