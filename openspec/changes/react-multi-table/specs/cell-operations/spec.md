## ADDED Requirements

### Requirement: 单元格选择
系统 SHALL 支持选择单个单元格、连续区域、不连续区域、整行、整列。

#### Scenario: 选择单个单元格
- **WHEN** 用户点击单元格 A1
- **THEN** A1 被高亮显示为选中状态

#### Scenario: 选择连续区域
- **WHEN** 用户从 A1 拖动到 C3
- **THEN** A1:C3 区域被高亮选中

#### Scenario: 选择不连续区域
- **WHEN** 用户按住 Ctrl 键依次点击 A1、C3、E5
- **THEN** A1、C3、E5 三个单元格同时被选中

#### Scenario: 选择整行
- **WHEN** 用户点击行标题 "5"
- **THEN** 第 5 行所有单元格被选中

#### Scenario: 选择整列
- **WHEN** 用户点击列标题 "C"
- **THEN** C 列所有单元格被选中

### Requirement: 复制单元格
系统 SHALL 支持将选中的单元格内容复制到剪贴板。

#### Scenario: 复制单个单元格
- **WHEN** 用户选中 A1（内容为"Hello"）并按下 Ctrl+C
- **THEN** "Hello" 被复制到系统剪贴板

#### Scenario: 复制区域
- **WHEN** 用户选中 A1:B2（2x2 区域）并按下 Ctrl+C
- **THEN** 区域内容以制表符分隔格式复制到剪贴板

### Requirement: 粘贴单元格
系统 SHALL 支持从剪贴板粘贴内容到选中的单元格。

#### Scenario: 粘贴单个值
- **WHEN** 剪贴板内容为"World"，用户选中 A1 并按下 Ctrl+V
- **THEN** A1 的内容变为 "World"

#### Scenario: 粘贴区域
- **WHEN** 剪贴板包含 2x2 表格数据，用户选中 A1 并按下 Ctrl+V
- **THEN** A1:B2 区域被填充为剪贴板中的数据

### Requirement: 删除单元格
系统 SHALL 支持删除选中的单元格，可选择移动周围单元格填补空缺。

#### Scenario: 删除并右移
- **WHEN** 用户选中 B2 选择"删除"→"右侧单元格左移"
- **THEN** B2 被删除，B 列右侧的单元格向左移动

#### Scenario: 删除整行
- **WHEN** 用户选中第 5 行选择"删除"→"整行"
- **THEN** 第 5 行被删除，下方行上移

### Requirement: 清除内容
系统 SHALL 支持清除选中单元格的内容但保留样式和公式。

#### Scenario: 清除内容
- **WHEN** 用户选中 A1:B2 并按下 Delete 键
- **THEN** A1:B2 的内容被清空，样式保持不变

### Requirement: 右键菜单
系统 SHALL 在用户右键点击时显示上下文菜单，包含常用操作。

#### Scenario: 显示右键菜单
- **WHEN** 用户右键点击选中的单元格
- **THEN** 显示菜单：复制、粘贴、剪切、删除、清除内容、插入行、插入列

### Requirement: 填充手柄
系统 SHALL 支持拖动填充手柄自动填充序列或复制内容。

#### Scenario: 复制填充
- **WHEN** A1="商品", A2="A"，用户选中 A1:A2 并拖动填充手柄到 A4
- **THEN** A3="商品", A4="A"（复制模式）

#### Scenario: 序列填充
- **WHEN** A1=1, A2=2，用户选中 A1:A2 并拖动填充手柄到 A4
- **THEN** A3=3, A4=4（等差序列）
