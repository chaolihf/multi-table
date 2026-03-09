## ADDED Requirements

### Requirement: 单元格图片
系统 SHALL 支持在单元格中存储和显示图片。

#### Scenario: 插入图片
- **WHEN** 用户选择单元格并点击"插入图片"按钮
- **THEN** 可选择上传图片文件或输入图片 URL
- **AND** 确认后单元格显示图片缩略图

#### Scenario: 图片预览
- **WHEN** 用户点击带图片的单元格
- **THEN** 弹出对话框显示原尺寸图片预览

#### Scenario: 图片调整
- **WHEN** 用户拖动单元格边框调整大小
- **THEN** 图片随单元格大小自适应缩放

#### Scenario: 清除图片
- **WHEN** 用户选中带图片的单元格并按 Delete 键
- **THEN** 图片被清除，单元格恢复空白
