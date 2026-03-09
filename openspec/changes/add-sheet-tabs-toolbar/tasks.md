## 1. 扩展数据类型

- [ ] 1.1 在 `Sheet` 接口中添加 `hidden?: boolean` 字段
- [ ] 1.2 在 `Sheet` 接口中添加样式相关字段（可选）

## 2. Sheet 页标签组件

- [ ] 2.1 创建 `SheetTabs` 组件，显示 sheet 标签列表
- [ ] 2.2 实现点击切换 sheet 功能
- [ ] 2.3 实现当前 sheet 标签高亮显示
- [ ] 2.4 实现右键菜单（新增、移动、复制、隐藏、重命名、删除）
- [ ] 2.5 实现"+"按钮新增 sheet 功能

## 3. Sheet 管理功能

- [ ] 3.1 在 store 中添加 `addSheet` 方法
- [ ] 3.2 在 store 中添加 `duplicateSheet` 方法
- [ ] 3.3 在 store 中添加 `moveSheet` 方法
- [ ] 3.4 在 store 中添加 `hideSheet` 方法
- [ ] 3.5 在 store 中添加 `showSheet` 方法
- [ ] 3.6 在 store 中添加 `renameSheet` 方法
- [ ] 3.7 在 store 中添加 `deleteSheet` 方法
- [ ] 3.8 修改初始化逻辑，默认创建 3 个 sheet

## 4. 工具栏功能实现

- [ ] 4.1 在 store 中添加 `setCellStyle` 方法
- [ ] 4.2 实现加粗功能（连接 store）
- [ ] 4.3 实现斜体功能（连接 store）
- [ ] 4.4 实现对齐方式功能（连接 store）
- [ ] 4.5 实现背景色选择功能（连接 store）
- [ ] 4.6 实现文字颜色选择功能（连接 store）
- [ ] 4.7 实现字体大小选择功能（连接 store）

## 5. 集成与布局

- [ ] 5.1 在 `App.tsx` 中添加顶部工具栏布局
- [ ] 5.2 在 `App.tsx` 中添加底部 sheet 页签布局
- [ ] 5.3 调整 Canvas 容器高度，适应新布局

## 6. 测试与验证

- [ ] 6.1 测试 sheet 切换功能
- [ ] 6.2 测试所有右键菜单操作
- [ ] 6.3 测试工具栏所有样式设置功能
- [ ] 6.4 验证样式持久化
