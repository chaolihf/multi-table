## Why

当前缺乏一个基于 Web 的协同多维表格编辑工具，用户需要一个类似 Excel 但更轻量、支持实时协作的在线表格应用。通过 Canvas 渲染实现高性能表格展示，支持公式计算和多人协同编辑，满足团队数据协作需求。

## What Changes

- 新增基于 React + Canvas 的高性能表格渲染引擎
- 实现表格行列的动态添加、删除、调整宽度功能
- 支持单元格内容编辑，包括文本和类 Excel 公式
- 集成实时协作功能，支持多人同时编辑
- 实现基于用户角色的权限控制系统（可见范围、编辑权限）
- 支持单元格/行/列的选择、复制、粘贴、删除、清除等右键操作

## Capabilities

### New Capabilities

- `canvas-renderer`: 基于 Canvas 的表格渲染引擎，支持高性能大数据量表格展示
- `formula-engine`: 公式解析和计算引擎，支持常用 Excel 函数
- `collaborative-editing`: 实时协同编辑功能，支持操作同步和冲突解决
- `permission-control`: 权限控制系统，管理用户可见范围和编辑权限
- `cell-operations`: 单元格操作模块，支持选择、复制、粘贴、删除等操作

### Modified Capabilities

<!-- 无现有能力需要修改 -->

## Impact

- 前端：新增 React 组件库，Canvas 渲染层
- 后端：需要 WebSocket 服务支持实时协作，数据库存储表格数据和操作日志
- 依赖：可能需要引入公式解析库（如 hot-formula-parser）、协同编辑算法（如 OT 或 CRDT）
- 性能：Canvas 渲染需优化大数据量场景下的性能
