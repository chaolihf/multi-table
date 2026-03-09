## ADDED Requirements

### Requirement: 实时操作同步
系统 SHALL 在 100ms 内将用户的编辑操作同步给其他协作者。

#### Scenario: 内容同步
- **WHEN** 用户 A 在单元格 A1 输入 "Hello"
- **THEN** 用户 B 的界面在 100ms 内显示 A1 内容为 "Hello"

### Requirement: 操作转换
系统 SHALL 使用 OT 算法解决并发编辑冲突，保证最终一致性。

#### Scenario: 并发编辑不同单元格
- **WHEN** 用户 A 修改 A1，同时用户 B 修改 B1
- **THEN** 两个修改都被保留，所有用户看到一致的结果

#### Scenario: 并发编辑同一单元格
- **WHEN** 用户 A 和 B 同时修改 A1，A 输入"abc"，B 输入"xyz"
- **THEN** 采用服务端时间戳，后到达的操作覆盖先到达的操作

### Requirement: 光标同步
系统 SHALL 显示其他协作者的光标位置和选中区域。

#### Scenario: 显示他人光标
- **WHEN** 用户 B 选中单元格 C5
- **THEN** 用户 A 的界面显示用户 B 的光标在 C5，带有用户 B 的颜色标识

### Requirement: 用户存在感知
系统 SHALL 显示当前正在编辑表格的其他用户列表。

#### Scenario: 用户列表
- **WHEN** 3 个用户同时打开表格
- **THEN** 每个用户的界面显示其他 2 个用户的头像/名称

### Requirement: 离线重连
系统 SHALL 在网络断开时缓存本地操作，重连后自动同步。

#### Scenario: 断网重连
- **WHEN** 用户编辑时网络断开，编辑完成后网络恢复
- **THEN** 本地缓存的操作自动同步到服务端和其他客户端

### Requirement: 操作历史
系统 SHALL 记录所有编辑操作，支持撤销/重做。

#### Scenario: 撤销操作
- **WHEN** 用户修改 A1 后按下 Ctrl+Z
- **THEN** A1 恢复到修改前的值
