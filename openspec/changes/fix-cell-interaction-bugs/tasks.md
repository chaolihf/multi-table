## 1. 修复双击编辑

- [x] 1.1 在 `handleMouseDown` 中修复双击检测逻辑，确保 `e.detail === 2` 正确触发
- [x] 1.2 双击时调用 `setEditingCell` store 方法而非仅设置本地状态
- [x] 1.3 测试双击进入编辑模式功能

## 2. 修复键盘输入编辑

- [x] 2.1 修改 `handleKeyDown` 逻辑，检测到可打印字符时先设置编辑状态
- [x] 2.2 确保输入字符正确显示在编辑框中
- [x] 2.3 测试 F2 键进入编辑模式功能
- [x] 2.4 测试字母、数字键输入功能

## 3. 修复右键菜单操作基准

- [x] 3.1 修改 `handleCopy` 函数，使用 `selection.anchor` 和 `selection.focus` 计算复制范围
- [x] 3.2 修改 `handlePaste` 函数，以选中区域起点为粘贴基准
- [x] 3.3 修改 `handleInsertRow` 函数，使用选中区域的行索引
- [x] 3.4 修改 `handleInsertColumn` 函数，使用选中区域的列索引
- [x] 3.5 修改 `handleDeleteRow` 和 `handleDeleteColumn` 函数
- [x] 3.6 测试所有右键菜单操作

## 4. 修复行/列标题选择

- [x] 4.1 修正 `handleMouseDown` 中行标题点击的坐标计算逻辑
- [x] 4.2 修正 `handleMouseDown` 中列标题点击的坐标计算逻辑
- [x] 4.3 确保点击行标题时选中整行所有列
- [x] 4.4 确保点击列标题时选中整列所有行
- [x] 4.5 测试行/列标题选择功能

## 5. 测试与验证

- [x] 5.1 验证所有 4 个 bug 已修复
- [x] 5.2 确保现有功能未被破坏（拖动选择、滚动等）
- [x] 5.3 运行现有单元测试
