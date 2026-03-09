## Why

当前应用缺少多 sheet 页管理和单元格格式化工具栏，用户无法在多个工作表之间切换，也无法便捷地设置单元格样式。需要添加类似 Excel 的 sheet 页签和工具栏功能，提升用户体验。

## What Changes

- 在底部添加 sheet 页标签栏，支持多 sheet 切换
- 支持右键菜单操作：新增、移动、复制、隐藏、显示、重命名 sheet
- 在顶部添加工具栏，支持设置单元格背景色、字体颜色、字体大小等样式

## Capabilities

### New Capabilities
- `sheet-tabs`: 支持多 sheet 页管理，包括切换、新增、移动、复制、隐藏、显示、重命名
- `toolbar`: 提供单元格格式化工具栏，包括背景色、字体、对齐方式等设置

### Modified Capabilities

无

## Impact

- `App.tsx`: 添加 sheet 页签和工具栏组件
- `sheetStore.ts`: 扩展 sheet 管理功能（移动、复制、隐藏、重命名）
- 新增 `SheetTabs` 组件
- 新增 `Toolbar` 组件（已有但需扩展功能）
- `types/index.ts`: 扩展 Sheet 数据结构（隐藏状态等）
