## ADDED Requirements

### Requirement: 单元格链接
系统 SHALL 支持在单元格中存储和显示网址链接。

#### Scenario: 插入链接
- **WHEN** 用户选择单元格并点击"插入链接"按钮
- **THEN** 弹出对话框输入 URL 和显示文本
- **AND** 确认后单元格显示为可点击的链接

#### Scenario: 点击链接
- **WHEN** 用户点击带链接的单元格
- **THEN** 在新标签页中打开链接 URL

#### Scenario: 编辑链接
- **WHEN** 用户双击带链接的单元格
- **THEN** 进入编辑模式，可修改 URL 和显示文本

#### Scenario: 清除链接
- **WHEN** 用户选中带链接的单元格并按 Delete 键
- **THEN** 链接被清除，单元格恢复普通文本
