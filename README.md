# Swing - 羽毛球挥拍计数器

HarmonyOS NEXT 羽毛球训练助手，实时追踪挥拍次数、速度和训练数据。

## 功能特性

### Phase 1 (MVP) - 已完成
- ✅ 基础训练模式（开始/暂停/继续/结束）
- ✅ 加速度计挥拍检测
- ✅ 实时数据显示（次数、时长、速度、卡路里）
- ✅ 本地存储（最多30个历史记录）
- ✅ 双模式支持（标准/专业模式）
- ✅ 崩溃恢复机制
- ✅ 速度计算和统计

### Phase 2 (计划中)
- 🔄 历史记录查看与统计
- 🔄 振动和声音反馈
- 🔄 目标设定功能

## 技术架构

- **平台:** HarmonyOS NEXT (API 12)
- **语言:** ArkTS
- **状态管理:** AppStorage + PersistentStorage
- **传感器:** 加速度计 (采样间隔: 20000μs)
- **数据持久化:** Preferences API

## 核心算法

**挥拍检测算法:**
- 计算三轴加速度向量幅度
- 阈值触发: >15 m/s²
- 防抖机制: 200ms 最小间隔

**速度计算:**
- 平均速度 = 总次数 / 时长(分钟)

## 项目结构

```
src/
├── pages/
│   └── Index.ets              # 主页面
├── models/
│   └── WorkoutSession.ts      # 数据模型
├── services/
│   ├── SensorService.ts       # 传感器服务
│   └── StorageService.ts      # 存储服务
├── state/
│   └── WorkoutState.ts        # 状态管理
└── utils/
    └── CalorieCalculator.ts   # 卡路里计算
```

## 构建与运行

```bash
# 使用 DevEco Studio 打开项目
# 连接 HarmonyOS 设备或启动模拟器
# 点击运行按钮或使用快捷键 Shift+F10
```

## 测试

参考 `test-log.txt` 进行完整的手动测试，包括:
- 基础流程集成测试
- 崩溃恢复测试
- 边界情况测试
- 性能测试

## 设计文档

详细设计规范见 `design-spec.md`

## 版本历史

- **v1.0.0-phase1** (2026-06-15) - Phase 1 MVP 完成

## 许可证

MIT License
