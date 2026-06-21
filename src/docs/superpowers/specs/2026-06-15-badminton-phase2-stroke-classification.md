# 羽毛球运动追踪应用 - 阶段二：击球类型分类

> **项目**: 羽毛球运动追踪应用（Xiaomi Vela SmartWatch）
> **阶段**: Phase 2 - 击球类型分类功能
> **日期**: 2026-06-15
> **基于**: Phase 1 MVP (v1.0.0-phase1)

---

## 1. 功能概述

在阶段一基础挥拍检测的基础上，添加击球类型自动分类功能，通过分析加速度方向识别四种主要击球类型：

- **杀球（Smash）** - 向下发力的进攻性击球
- **抽球（Drive）** - 水平发力的快速击球
- **挑球（Lift）** - 向上发力的防守性击球
- **高远球（Clear）** - 向上发力的主动性后场击球

**核心目标**：
- 实时识别并统计各类型击球次数
- 提供更详细的运动数据分析
- 为用户提供技术改进参考

**非目标**：
- 不包含图表可视化（阶段三实现）
- 不包含每种类型的独立速度统计（使用全局速度）
- 不包含自动暂停优化（阶段三实现）

---

## 2. 架构设计

### 2.1 组件职责

**新增组件：**

**StrokeClassifier（击球分类器）**
- **职责**：根据加速度数据判断击球类型
- **输入**：x, y, z 加速度值，magnitude 模
- **输出**：击球类型字符串 ('smash' | 'drive' | 'lift' | 'clear' | 'other' | null)
- **特点**：无状态，纯函数式逻辑

**修改组件：**

**SensorManager**
- 新增职责：集成 StrokeClassifier，在检测到挥拍时调用分类器
- 修改：回调函数从 `callback(magnitude, speed)` 改为 `callback(type, speed)`

**SessionManager**
- 新增职责：记录各类型击球的统计数据
- 修改：`recordSwing()` 方法接收击球类型参数
- 扩展：stats 数据结构添加 smash/drive/lift/clear 字段

**StorageManager**
- 新增职责：检测数据版本，清空旧版本历史
- 修改：`loadHistory()` 方法添加版本检查逻辑

### 2.2 数据流

```
传感器原始数据 (x, y, z)
    ↓
SensorManager.handleSensorData()
    ↓ 计算 magnitude
    ↓
StrokeClassifier.classify(x, y, z, magnitude)
    ↓ 分析方向和强度
    ↓
返回击球类型 'smash' | 'drive' | 'lift' | 'clear' | 'other'
    ↓
swingCallback(type, speed) 触发
    ↓
SessionManager.recordSwing(type, speed)
    ↓ 更新统计
    ↓
UI 更新（各类型计数、速度）
```

---

## 3. 击球分类算法

### 3.1 分类逻辑（分层判断）

**第一层：有效挥拍判断**
- 检查 `magnitude >= swingThreshold`（standard: 2.0g, professional: 2.5g）
- 不满足则返回 `null`（不是有效挥拍）

**第二层：方向分析**
- 计算 z 轴占比：`zRatio = z / magnitude`
- 根据 zRatio 和 magnitude 判断类型

**分类规则（按优先级）：**

1. **杀球（Smash）**：`zRatio < -0.6`
   - z 轴负值（向下）且占比大于 60%
   - 特征：向下挥拍，进攻性击球
   
2. **抽球（Drive）**：`|zRatio| < 0.4`
   - z 轴占比小于 40%（主要是水平运动）
   - 特征：平抽快挡，水平发力

3. **高远球（Clear）**：`magnitude >= 3.5g && 0.5 < zRatio < 0.8`
   - 加速度较大（≥3.5g）
   - z 轴正值（向上）且占比在 50%-80%
   - 特征：后场主动高球，向上发力且有力量

4. **挑球（Lift）**：`zRatio > 0.5`
   - z 轴正值（向上）且占比大于 50%
   - 不满足高远球条件（速度慢或角度更陡）
   - 特征：网前被动挑球

5. **其他（Other）**：满足 swingThreshold 但不符合以上特征
   - 边界情况或复合动作

### 3.2 阈值配置

**在 constants.js 添加：**

```javascript
// 方向判断系数
export const DIRECTION_COEFFICIENTS = {
  smashZ: -0.6,      // 杀球：z/magnitude < -0.6
  driveZ: 0.4,       // 抽球：|z/magnitude| < 0.4
  liftZ: 0.5,        // 挑球：z/magnitude > 0.5
  clearMinMag: 3.5,  // 高远球最低加速度（g）
  clearMaxZ: 0.8     // 高远球最大 z 占比
}
```

**为什么选择这些系数：**
- `-0.6`：杀球需要明显的向下分量
- `0.4`：抽球主要是水平，允许少量垂直分量
- `0.5`：向上击球的基本特征
- `3.5g`：高远球需要较大力量，区别于轻柔的挑球
- `0.8`：高远球不会完全垂直向上（太陡会失去距离）

**如何调整：**
- 真机测试后根据实际效果微调
- 如果杀球识别过多 → 提高 `smashZ` 绝对值（如 -0.7）
- 如果高远球识别不准 → 调整 `clearMinMag` 或 `clearMaxZ`

---

## 4. 数据模型

### 4.1 Session 数据结构（Version 2）

```javascript
{
  id: String,              // 唯一标识（时间戳）
  startTime: Number,       // 开始时间戳（ms）
  endTime: Number,         // 结束时间戳（ms）
  duration: Number,        // 实际运动时长（秒）
  mode: String,            // "standard" | "professional"
  
  stats: {
    totalSwings: Number,   // 总挥拍次数
    smash: Number,         // 杀球次数
    drive: Number,         // 抽球次数
    lift: Number,          // 挑球次数
    clear: Number,         // 高远球次数
    other: Number,         // 其他挥拍次数
    
    maxSpeed: Number,      // 全局最快速度 (km/h)
    avgSpeed: Number,      // 全局平均速度 (km/h)
    currentSpeed: Number,  // 当前速度（实时，不持久化）
    
    heartRate: null        // 预留字段
  },
  
  version: 2,              // 数据版本标记（新增）
  isActive: Boolean,       // 会话是否活跃
  isPaused: Boolean,       // 是否暂停
  lastSwingTime: Number    // 最后挥拍时间（用于自动暂停）
}
```

**版本管理策略：**
- **Version 1**（阶段一）：无 version 字段，stats 只有 totalSwings
- **Version 2**（阶段二）：明确标记 `version: 2`，stats 包含各类型计数
- **兼容性处理**：检测到 version 1 数据时清空历史（用户选择方案 B）

**Why：**开发阶段允许破坏性更新，简化实现。生产环境需要迁移脚本。

### 4.2 统计数据计算

**totalSwings 计算：**
```javascript
totalSwings = smash + drive + lift + clear + other
```

**平均速度计算：**
```javascript
avgSpeed = Math.round(totalSpeed / totalSwings)
// totalSpeed 是所有挥拍速度的累加
```

**最快速度更新：**
```javascript
if (currentSpeed > maxSpeed) {
  maxSpeed = currentSpeed
}
```

---

## 5. 实现细节

### 5.1 StrokeClassifier 类

**文件**: `common/strokeClassifier.js`

```javascript
import { THRESHOLDS, DIRECTION_COEFFICIENTS } from './constants.js'

/**
 * 击球类型分类器
 */
class StrokeClassifier {
  /**
   * @param {string} mode - 'standard' | 'professional'
   */
  constructor(mode = 'standard') {
    this.mode = mode
    this.threshold = THRESHOLDS[mode].swingThreshold
  }
  
  /**
   * 分类击球类型
   * @param {number} x - X轴加速度
   * @param {number} y - Y轴加速度
   * @param {number} z - Z轴加速度
   * @param {number} magnitude - 加速度模
   * @returns {string|null} 击球类型或 null
   */
  classify(x, y, z, magnitude) {
    // 第一层：检查是否是有效挥拍
    if (magnitude < this.threshold) {
      return null
    }
    
    // 第二层：分析方向
    const zRatio = z / magnitude
    const { smashZ, driveZ, liftZ, clearMinMag, clearMaxZ } = DIRECTION_COEFFICIENTS
    
    // 按优先级判断类型
    if (zRatio < smashZ) {
      return 'smash'
    } else if (Math.abs(zRatio) < driveZ) {
      return 'drive'
    } else if (magnitude >= clearMinMag && zRatio > liftZ && zRatio < clearMaxZ) {
      return 'clear'
    } else if (zRatio > liftZ) {
      return 'lift'
    } else {
      return 'other'
    }
  }
  
  /**
   * 更新模式
   * @param {string} mode - 'standard' | 'professional'
   */
  updateMode(mode) {
    this.mode = mode
    this.threshold = THRESHOLDS[mode].swingThreshold
  }
}

export default StrokeClassifier
```

### 5.2 SensorManager 集成

**修改 `pages/main/index.ux` 中的 SensorManager 类：**

```javascript
import StrokeClassifier from '../../common/strokeClassifier.js'

class SensorManager {
  constructor(mode, swingCallback) {
    this.mode = mode
    this.swingCallback = swingCallback
    this.isSubscribed = false
    this.lastSwingTime = 0
    this.classifier = new StrokeClassifier(mode)  // 新增分类器
  }
  
  handleSensorData(data) {
    const { x, y, z } = data
    const magnitude = calculateMagnitude(x, y, z)
    
    // 调用分类器判断类型
    const strokeType = this.classifier.classify(x, y, z, magnitude)
    
    if (strokeType) {
      const now = Date.now()
      
      // 防抖检查
      if (now - this.lastSwingTime < DEBOUNCE_TIME) {
        return
      }
      
      this.lastSwingTime = now
      const speed = calculateSpeed(magnitude, SPEED_COEFFICIENT)
      
      console.log(`${strokeType} detected! speed=${speed}km/h`)
      
      // 触发回调，传递类型和速度
      if (this.swingCallback) {
        this.swingCallback(strokeType, speed)
      }
    }
  }
  
  updateThreshold(mode) {
    this.mode = mode
    this.classifier.updateMode(mode)  // 更新分类器模式
  }
}
```

### 5.3 SessionManager 更新

**修改 `recordSwing` 方法：**

```javascript
class SessionManager {
  // ... 现有代码
  
  /**
   * 记录一次挥拍
   * @param {string} type - 击球类型
   * @param {number} speed - 速度
   */
  recordSwing(type, speed) {
    if (!this.session) return
    
    // 更新对应类型的计数
    this.session.stats[type]++
    this.session.stats.totalSwings++
    
    // 更新速度统计
    this.session.stats.currentSpeed = speed
    if (speed > this.session.stats.maxSpeed) {
      this.session.stats.maxSpeed = speed
    }
    
    // 累加速度用于计算平均值
    this.totalSpeed += speed
    this.session.stats.avgSpeed = Math.round(
      this.totalSpeed / this.session.stats.totalSwings
    )
    
    // 更新最后挥拍时间（用于自动暂停）
    this.session.lastSwingTime = Date.now()
    
    console.log(`Recorded ${type}: total=${this.session.stats.totalSwings}, avg=${this.session.stats.avgSpeed}km/h`)
  }
}
```

**修改 `createSession` 方法初始化：**

```javascript
createSession(mode = 'standard') {
  const now = Date.now()
  this.session = {
    id: now.toString(),
    mode: mode,
    startTime: now,
    endTime: null,
    duration: 0,
    totalTime: 0,
    pausedTime: 0,
    pauseStartTime: null,
    stats: {
      totalSwings: 0,
      smash: 0,        // 新增
      drive: 0,        // 新增
      lift: 0,         // 新增
      clear: 0,        // 新增
      other: 0,        // 新增
      maxSpeed: 0,
      avgSpeed: 0,
      currentSpeed: 0,
      heartRate: null
    },
    version: 2,        // 新增版本标记
    isActive: true,
    isPaused: false,
    lastSwingTime: now
  }
  
  this.totalSpeed = 0
  return this.session
}
```

### 5.4 版本兼容性处理

**修改 StorageManager.loadHistory()：**

```javascript
static loadHistory() {
  return new Promise((resolve) => {
    storage.get({
      key: STORAGE_KEY,
      success: (data) => {
        try {
          const history = JSON.parse(data)
          if (!Array.isArray(history)) {
            resolve([])
            return
          }
          
          // 检查是否有旧版本数据（version < 2 或无 version）
          const hasOldData = history.some(session => !session.version || session.version < 2)
          
          if (hasOldData) {
            console.log('Detected old version data (v1), clearing history for Phase 2')
            // 清空旧数据
            storage.delete({
              key: STORAGE_KEY,
              success: () => console.log('Old history cleared'),
              fail: (data, code) => console.error('Failed to clear old history:', code)
            })
            resolve([])
          } else {
            console.log(`Loaded ${history.length} sessions (v2)`)
            resolve(history)
          }
        } catch (e) {
          console.error('Failed to parse history:', e)
          resolve([])
        }
      },
      fail: (data, code) => {
        console.log('No history found:', code)
        resolve([])
      }
    })
  })
}
```

---

## 6. UI 更新

### 6.1 运动中界面（Running State）

**当前布局（阶段一）：**
```
[挥拍次数: X] [杀球次数: 0 (阶段2)]
    [当前速度: XX km/h]
[抽球次数: 0 (阶段2)] [挑球次数: 0 (阶段2)]
```

**更新布局（阶段二）：**
```
[杀球: X次] [抽球: X次]
    [当前速度: XX km/h]
[挑球: X次] [高远球: X次]
```

**模板更新：**

```html
<!-- Top row -->
<div class="card-row">
  <div class="card-small">
    <text class="card-label">杀球</text>
    <text class="card-value">{{session ? session.stats.smash : 0}}</text>
  </div>
  <div class="card-small">
    <text class="card-label">抽球</text>
    <text class="card-value">{{session ? session.stats.drive : 0}}</text>
  </div>
</div>

<!-- Center: Current speed -->
<div class="card-large">
  <text class="card-label-center">当前速度</text>
  <text class="card-value-large">{{session ? session.stats.currentSpeed : 0}}</text>
  <text class="card-unit">km/h</text>
  <text class="card-max">最快: {{session ? session.stats.maxSpeed : 0}} km/h</text>
</div>

<!-- Bottom row -->
<div class="card-row">
  <div class="card-small">
    <text class="card-label">挑球</text>
    <text class="card-value">{{session ? session.stats.lift : 0}}</text>
  </div>
  <div class="card-small">
    <text class="card-label">高远球</text>
    <text class="card-value">{{session ? session.stats.clear : 0}}</text>
  </div>
</div>
```

### 6.2 完成界面（Finished State）

**更新布局：**

```html
<div class="summary-card">
  <div class="summary-row">
    <text class="summary-label">运动时长</text>
    <text class="summary-value">{{getFormattedDuration()}}</text>
  </div>
  <div class="summary-row">
    <text class="summary-label">总挥拍</text>
    <text class="summary-value">{{session ? session.stats.totalSwings : 0}}次</text>
  </div>
  
  <!-- 各类型细分 -->
  <div class="summary-row summary-sub">
    <text class="summary-label-sub">　├ 杀球</text>
    <text class="summary-value-sub">{{session ? session.stats.smash : 0}}次</text>
  </div>
  <div class="summary-row summary-sub">
    <text class="summary-label-sub">　├ 抽球</text>
    <text class="summary-value-sub">{{session ? session.stats.drive : 0}}次</text>
  </div>
  <div class="summary-row summary-sub">
    <text class="summary-label-sub">　├ 挑球</text>
    <text class="summary-value-sub">{{session ? session.stats.lift : 0}}次</text>
  </div>
  <div class="summary-row summary-sub">
    <text class="summary-label-sub">　└ 高远球</text>
    <text class="summary-value-sub">{{session ? session.stats.clear : 0}}次</text>
  </div>
  
  <div class="summary-row">
    <text class="summary-label">最快速度</text>
    <text class="summary-value">{{session ? session.stats.maxSpeed : 0}} km/h</text>
  </div>
  <div class="summary-row">
    <text class="summary-label">平均速度</text>
    <text class="summary-value">{{session ? session.stats.avgSpeed : 0}} km/h</text>
  </div>
</div>
```

**新增样式：**

```css
.summary-sub {
  margin-bottom: 8px;
  margin-left: 10px;
}

.summary-label-sub {
  font-size: 12px;
  color: #777777;
}

.summary-value-sub {
  font-size: 13px;
  color: #cccccc;
}
```

### 6.3 测试功能更新

**修改 `testSwing()` 方法：**

```javascript
testSwing() {
  if (this.appState !== 'running') {
    console.log('Cannot test swing - not in running state')
    return
  }

  console.log('Test swing triggered')

  // 随机生成击球类型
  const types = ['smash', 'drive', 'lift', 'clear']
  const randomType = types[Math.floor(Math.random() * types.length)]
  
  // 根据类型生成对应速度范围
  let randomSpeed
  switch(randomType) {
    case 'smash':
      randomSpeed = Math.floor(Math.random() * 40) + 80  // 80-120 km/h
      break
    case 'drive':
      randomSpeed = Math.floor(Math.random() * 40) + 60  // 60-100 km/h
      break
    case 'clear':
      randomSpeed = Math.floor(Math.random() * 40) + 70  // 70-110 km/h
      break
    case 'lift':
      randomSpeed = Math.floor(Math.random() * 40) + 40  // 40-80 km/h
      break
  }

  // 记录挥拍
  if (this.sessionManager) {
    this.sessionManager.recordSwing(randomType, randomSpeed)

    // 更新 UI
    this.session = this.sessionManager.getSession()
    this.$set('session', { ...this.session })

    // 振动反馈
    vibrator.vibrate({
      mode: 'short'
    })

    console.log(`Test ${randomType} recorded: ${randomSpeed} km/h`)
  }
}
```

---

## 7. 测试策略

### 7.1 单元测试重点（手动验证）

**StrokeClassifier 测试：**

| 测试用例 | x | y | z | magnitude | 预期结果 |
|---------|---|---|---|-----------|----------|
| 杀球 | 0 | 0 | -4.0 | 4.0 | 'smash' |
| 抽球 | 3.0 | 2.0 | 0.5 | 3.64 | 'drive' |
| 挑球（轻） | 0 | 0 | 2.5 | 2.5 | 'lift' |
| 高远球 | 0 | 1.0 | 3.0 | 3.16 | 'lift' (不够强) |
| 高远球（有力） | 0 | 2.0 | 3.0 | 3.6 | 'clear' |
| 弱挥拍 | 0 | 0 | 1.5 | 1.5 | null |

**测试方法：**在控制台手动调用分类器验证逻辑。

### 7.2 集成测试

**模拟器测试步骤：**

1. **基础功能**
   - 开始运动
   - 点击"测试挥拍"按钮 20 次
   - 验证四种类型都有计数
   - 验证总挥拍 = 各类型之和
   - 验证速度统计正确

2. **暂停/继续**
   - 暂停后点击测试按钮（应该无效）
   - 继续后再测试（应该正常工作）

3. **完成统计**
   - 结束运动
   - 验证完成页面显示各类型统计
   - 验证速度统计正确

4. **历史兼容性**
   - （如果有阶段一数据）重启应用
   - 验证旧数据被清空
   - 验证新运动可以正常保存

### 7.3 真机测试（重点）

**阈值调整验证：**

1. **标准模式测试**
   - 实际打羽毛球 10 分钟
   - 记录各类型识别准确率
   - 如果杀球识别过多/过少 → 调整 `smashZ`
   - 如果高远球和挑球混淆 → 调整 `clearMinMag`

2. **专业模式测试**
   - 专业球员测试
   - 验证 2.5g 阈值是否合适
   - 根据反馈调整

**已知风险：**
- 方向系数可能需要多次调整
- 不同握拍方式可能影响 z 轴方向
- 手表佩戴位置影响数据准确性

---

## 8. 边界情况处理

### 8.1 数据异常

**传感器数据异常：**
- magnitude 为 NaN → calculateMagnitude 已有验证，返回 0
- 分类器返回 null → 不触发回调，不记录

**分类边界情况：**
- zRatio 恰好等于阈值 → 按 if-else 优先级判断
- magnitude 略小于 clearMinMag → 判为 lift

### 8.2 UI 显示

**零值显示：**
- 所有类型初始为 0，正常显示"0 次"
- 完成页面即使某类型为 0 也显示

**大数值：**
- 挥拍次数超过 999 → 正常显示（手表屏幕够宽）
- 速度超过 200 km/h → 正常显示（理论上不会发生）

### 8.3 性能考虑

**分类器性能：**
- classify() 方法只有几次比较操作，性能无忧
- 传感器频率 ~50Hz，每秒 50 次调用可接受

**UI 更新频率：**
- 防抖机制（200ms）限制了更新频率
- 每次挥拍只触发一次 UI 更新

---

## 9. 后续扩展（阶段三预留）

**预留接口：**
- 每种类型的独立速度统计（在 stats 中添加 `smashMaxSpeed`, `driveAvgSpeed` 等）
- 详细的挥拍时间序列（记录每次挥拍的时间戳、类型、速度）
- 击球分布分析（时间段内各类型占比）

**不在当前范围：**
- 图表可视化（饼图、折线图）
- 历史记录详情页
- 数据导出功能

---

## 10. 成功标准

**功能完整性：**
- ✅ 能识别 4 种主要击球类型
- ✅ 实时显示各类型计数
- ✅ 完成页面显示详细统计
- ✅ 测试功能支持所有类型

**数据准确性：**
- ✅ 模拟器测试：100 次随机测试，类型分布均匀（各约 25%）
- ✅ 真机测试：识别准确率 > 80%（主观评估）

**兼容性：**
- ✅ 旧版本数据正确清空
- ✅ 新版本数据正确保存和读取

**性能：**
- ✅ 传感器数据处理延迟 < 50ms
- ✅ UI 更新流畅，无卡顿

---

## 11. 开发计划

**预估工作量：** 4-6 小时

**任务分解：**
1. 创建 StrokeClassifier 类（30 分钟）
2. 更新 constants.js 配置（10 分钟）
3. 修改 SensorManager 集成分类器（30 分钟）
4. 修改 SessionManager 数据结构和记录逻辑（40 分钟）
5. 更新 StorageManager 版本检查（20 分钟）
6. 更新运动中界面 UI（40 分钟）
7. 更新完成界面 UI（30 分钟）
8. 更新测试功能（20 分钟）
9. 模拟器集成测试（60 分钟）
10. 真机测试和调优（60-120 分钟）

**里程碑：**
- M1：分类器实现并通过单元测试
- M2：UI 更新完成，模拟器可测试
- M3：真机测试通过，阈值调优完成
- M4：代码审查和文档完善

---

## 12. 风险和缓解

**风险 1：方向系数不准确**
- 影响：识别准确率低
- 缓解：真机测试后快速迭代调整，constants 配置易于修改

**风险 2：手表佩戴方式影响数据**
- 影响：左右手、松紧程度影响 xyz 轴方向
- 缓解：在测试中记录佩戴方式，必要时提供校准功能（阶段三）

**风险 3：边界情况分类混淆**
- 影响：某些击球类型识别不稳定
- 缓解：优先保证主要类型准确，边界情况归入 'other' 类型

**风险 4：性能问题**
- 影响：传感器数据处理延迟
- 缓解：分类器逻辑简单，性能测试通过

---

## 13. 附录

### 13.1 相关文件清单

**新增文件：**
- `common/strokeClassifier.js` - StrokeClassifier 类

**修改文件：**
- `common/constants.js` - 添加 DIRECTION_COEFFICIENTS
- `pages/main/index.ux` - SensorManager、SessionManager、UI 更新

**配置文件：**
- `manifest.json` - 无需修改

### 13.2 参考资料

- 阶段一设计文档：`docs/superpowers/specs/2026-06-15-badminton-app-design.md`
- 阶段一实施计划：`docs/superpowers/plans/2026-06-15-badminton-phase1-mvp.md`
- Vela QuickApp 传感器文档：https://iot.mi.com/vela/quickapp/zh/features/system/sensor.html

### 13.3 术语表

- **Smash（杀球）**：向下发力的进攻性击球
- **Drive（抽球）**：水平发力的快速击球
- **Lift（挑球）**：网前被动向上挑球
- **Clear（高远球）**：后场主动向上高球
- **zRatio**：z 轴加速度占总加速度的比例
- **magnitude**：加速度向量的模（√(x²+y²+z²)）

---

**文档版本：** v1.0  
**最后更新：** 2026-06-15  
**状态：** 待审核
