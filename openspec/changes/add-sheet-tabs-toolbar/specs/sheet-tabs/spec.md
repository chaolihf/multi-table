## ADDED Requirements

### Requirement: Sheet 页标签
系统 SHALL 在底部显示 sheet 页标签栏，支持切换和管理多个工作表。

#### Scenario: 默认显示 3 个 sheet
- **WHEN** 应用启动时
- **THEN** 底部显示 Sheet1、Sheet2、Sheet3 三个标签

#### Scenario: 点击切换 sheet
- **WHEN** 用户点击"Sheet2"标签
- **THEN** 切换到 Sheet2 工作表，该标签高亮显示

#### Scenario: 右键菜单
- **WHEN** 用户右键点击 sheet 标签
- **THEN** 显示菜单：新增、移动、复制、隐藏、显示、重命名、删除

### Requirement: 新增 sheet
系统 SHALL 支持新增工作表。

#### Scenario: 右键新增
- **WHEN** 用户右键点击 sheet 标签选择"新增"
- **THEN** 在当前 sheet 后插入新 sheet，默认名为"Sheet4"

#### Scenario: 按钮新增
- **WHEN** 用户点击标签栏右侧的"+"按钮
- **THEN** 在最后一个 sheet 后插入新 sheet

### Requirement: 移动 sheet
系统 SHALL 支持移动工作表位置。

#### Scenario: 右键移动
- **WHEN** 用户右键点击"Sheet2"选择"移动"→"向左移动"
- **THEN** Sheet2 移动到 Sheet1 前面

#### Scenario: 移动到末尾
- **WHEN** 用户右键点击"Sheet2"选择"移动"→"移动到末尾"
- **THEN** Sheet2 移动到所有 sheet 最后

### Requirement: 复制 sheet
系统 SHALL 支持复制工作表。

#### Scenario: 复制 sheet
- **WHEN** 用户右键点击"Sheet1"选择"复制"
- **THEN** 创建"Sheet1 (2)"，包含所有数据和样式

### Requirement: 隐藏/显示 sheet
系统 SHALL 支持隐藏和显示工作表。

#### Scenario: 隐藏 sheet
- **WHEN** 用户右键点击"Sheet2"选择"隐藏"
- **THEN** Sheet2 标签从标签栏消失，数据保留

#### Scenario: 显示 sheet
- **WHEN** 用户右键点击任意标签选择"显示"
- **THEN** 显示子菜单列出所有隐藏的 sheet，点击可显示

### Requirement: 重命名 sheet
系统 SHALL 支持重命名工作表。

#### Scenario: 重命名
- **WHEN** 用户右键点击"Sheet1"选择"重命名"，输入"数据表"
- **THEN** 标签显示为"数据表"

### Requirement: 删除 sheet
系统 SHALL 支持删除工作表。

#### Scenario: 删除 sheet
- **WHEN** 用户右键点击"Sheet2"选择"删除"
- **THEN** Sheet2 被删除，至少保留一个 sheet
