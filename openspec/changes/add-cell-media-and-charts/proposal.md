## Why

当前表格应用只支持基础文本和数字内容，无法满足用户对富媒体内容和数据可视化的需求。添加链接、图片、图表和数据管理功能可以显著提升应用的实用性和竞争力。

## What Changes

- 单元格支持插入和显示网址链接（可点击跳转）
- 单元格支持插入和显示图片（缩略图预览）
- 根据选中数据区域生成分析图表（柱状图、折线图、饼图）
- 数据筛选功能（按条件筛选行）
- 数据排序功能（升序/降序排列）

## Capabilities

### New Capabilities
- `cell-links`: 支持单元格存储和显示网址链接，点击可跳转
- `cell-images`: 支持单元格存储和显示图片，支持缩略图预览
- `data-charts`: 根据选中区域数据生成可视化图表
- `data-filter`: 支持按条件筛选显示特定行
- `data-sort`: 支持按列值升序/降序排列数据

### Modified Capabilities
- `cell-operations`: 扩展单元格数据类型，支持链接和图片

## Impact

- `types/index.ts`: 扩展 Cell 数据结构，添加 link、image 字段
- `sheetStore.ts`: 添加筛选、排序、图表数据提取方法
- `CanvasRenderer.tsx`: 渲染链接、图片、图表
- 新增 `ChartView` 组件用于图表显示
- 新增 `FilterBar` 组件用于筛选条件
- 工具栏添加插入链接、图片、创建图表按钮
- 依赖 `chart.js` 或 `recharts` 用于图表渲染
