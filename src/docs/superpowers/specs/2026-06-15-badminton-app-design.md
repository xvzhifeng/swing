---
name: badminton-tracking-app
description: 羽毛球运动追踪应用设计规范 - 通过加速度传感器自动识别击球动作，提供实时监测和历史统计分析
metadata:
  type: feature
  platform: xiaomi-vela-quickapp
  device: watch
  created: 2026-06-15
---

# 羽毛球运动追踪应用设计规范

## 1. 应用概览

### 1.1 应用定位
一款专为羽毛球运动设计的小米手表运动追踪应用，通过手表的加速度传感器自动识别挥拍和击球动作，实时记录运动数据并提供统计分析。

### 1.2 核心功能
1. **实时运动监测** - 自动检测挥拍次数、击球类型（杀球/抽球/挑球）和速度
2. **混合控制模式** - 手动开始 + 自动暂停（2分钟无动作）+ 手动控制
3. **数据展示** - 运动中实时显示，结束后详细统计
4. **历史记录** - 保存最近30次训练记录，支持图表对比分析
5. **两档模式** - 标准模式和专业模式的阈值预设

### 1.3 技术架构
- **平台**：小米 Vela 快应用框架
- **设备类型**：智能手表 (watch)
- **核心传感器**：加速度计 (system.sensor)
- **数据存储**：本地存储 (system.storage)
- **UI框架**：.ux 文件（template + style + script 一体化）
- **编程语言**：JavaScript (ES6+)

### 1.4 开发策略

采用**渐进式开发**，分三个阶段迭代：

**阶段1：核心功能（MVP）**
- 基础运动模式（开始/暂停/继续/结束）
- 简单挥拍检测（基于加速度阈值）
- 实时数据展示（卡片式布局）
- 本地数据存储

**阶段2：进阶检测**
- 杀球、抽球、挑球分类识别（基于发力方向）
- 速度计算和统计
- 运动结束统计页面
- 两档模式切换（标准/专业）

**阶段3：完整体验**
- 历史记录列表和详情
- 图表分析和对比
- 自动暂停功能
- 数据管理（30条上限自动清理）

---

## 2. 数据模型与检测算法

### 2.1 核心数据结构

#### 运动会话（Session）
```javascript
{
  id: String,              // 唯一标识（时间戳生成）
  startTime: Number,       // 开始时间戳（ms）
  endTime: Number,         // 结束时间戳（ms）
  duration: Number,        // 实际运动时长（秒，不含暂停时间）
  mode: String,           // "standard" | "professional"
  
  // 统计数据
  stats: {
    totalSwings: Number,   // 总挥拍次数
    smash: Number,         // 杀球次数
    drive: Number,         // 抽球次数
    lift: Number,          // 挑球次数
    other: Number,         // 其他挥拍（阶段1使用）
    
    maxSpeed: Number,      // 最快速度 (km/h)
    avgSpeed: Number,      // 平均速度 (km/h)
    currentSpeed: Number,  // 当前速度（实时，不持久化）
    
    heartRate: null        // 心率（预留，当前显示 "--"）
  },
  
  status: String,         // "running" | "paused" | "finished"
  lastSwingTime: Number   // 最后一次挥拍时间戳（用于自动暂停判断）
}
```

### 2.2 击球检测算法设计

#### 阈值配置（两档模式）

```javascript
const THRESHOLDS = {
  // 标准模式（适合业余爱好者）
  standard: {
    swingThreshold: 2.0,    // 挥拍最低加速度 (g)
    smashThreshold: 4.0,    // 杀球加速度 (g)
    driveThreshold: 3.5,    // 抽球加速度 (g)
    liftThreshold: 2.5      // 挑球加速度 (g)
  },
  
  // 专业模式（适合专业球员，提高20%阈值）
  professional: {
    swingThreshold: 2.5,
    smashThreshold: 5.0,
    driveThreshold: 4.5,
    liftThreshold: 3.0
  }
}
```

#### 击球类型识别逻辑

基于加速度三轴数据 `(x, y, z)` 和加速度模：

```javascript
// 计算加速度向量模
magnitude = √(x² + y² + z²)

// 识别击球类型
if (magnitude < swingThreshold) {
  // 不是有效挥拍
  return null
}

// 分析主导轴和方向
if (magnitude >= smashThreshold && z < -0.6 * magnitude) {
  // 杀球：向下发力 + 高速
  return 'smash'
}
else if (magnitude >= driveThreshold && Math.abs(z) < 0.4 * magnitude) {
  // 抽球：水平发力 + 快速（z轴分量较小）
  return 'drive'
}
else if (magnitude >= liftThreshold && z > 0.5 * magnitude) {
  // 挑球：向上发力 + 中速
  return 'lift'
}
else if (magnitude >= swingThreshold) {
  // 其他有效挥拍
  return 'other'
}
```

**Why**：通过 z 轴分量占比判断发力方向，水平击球 z 轴分量小，杀球向下 z 为负，挑球向上 z 为正。

**How to apply**：
- 阈值系数（0.6, 0.4, 0.5）可能需要根据实测数据调整
- 阶段1先实现基础挥拍检测，阶段2再加入方向判断

#### 防抖与去重

```javascript
const DEBOUNCE_TIME = 200  // ms

// 检测到挥拍后，200ms内忽略后续峰值
if (currentTime - lastDetectionTime < DEBOUNCE_TIME) {
  return  // 忽略，避免重复计数
}

lastDetectionTime = currentTime
```

**Why**：同一次挥拍可能产生多个加速度峰值，需要去重。

### 2.3 速度计算

#### 简化估算公式

```javascript
// 基于加速度峰值的经验公式
speed_kmh = magnitude_g × 25
```

**Why**：这是一个简化估算，实际物理关系更复杂。该系数可能需要根据实测数据校准。

**How to apply**：
- 每次检测到有效挥拍时计算速度
- 更新 `currentSpeed`（实时显示）
- 更新 `maxSpeed`（取最大值）
- 累加到总速度用于计算 `avgSpeed`

---

## 3. 界面设计与交互流程

### 3.1 页面状态机

应用采用**单页面流式设计**，根据运动状态展示不同内容：

```
状态转换流程：
[未开始] --开始--> [运动中] --暂停--> [已暂停] --继续--> [运动中]
                      |                    |
                      +------结束----------+
                      ↓
                  [运动结束] --查看历史--> [历史记录] --新运动--> [未开始]
```

### 3.2 状态详细设计

#### 状态1：未开始 (idle)

**显示内容**：
- 应用标题："羽毛球运动"
- 上次运动简要数据（如存在）
  - "上次运动：6月14日 15:30"
  - "时长 35分钟 | 挥拍 89次"
- 模式选择开关：标准 / 专业
- 大按钮："开始运动"（绿色，主要操作）
- 次要按钮："查看历史"（灰色）

#### 状态2：运动中 (running)

**布局：平衡卡片式**（用户选择的 B 方案）

```
┌─────────────────────────────┐
│ 运动中  00:15:32  [标准] [II]│  ← 顶部状态栏
├─────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  │
│ │ 挥拍次数  │  │ 杀球次数  │  │  ← 上层：两个小卡片
│ │    45    │  │    12    │  │
│ └──────────┘  └──────────┘  │
│                              │
│ ┌──────────────────────────┐│
│ │      当前速度             ││
│ │       128                ││  ← 中心：速度大卡片
│ │      km/h                ││     （绿色背景突出）
│ │   最快: 145 km/h         ││
│ └──────────────────────────┘│
│                              │
│ ┌──────────┐  ┌──────────┐  │
│ │ 抽球次数  │  │ 挑球次数  │  │  ← 下层：两个小卡片
│ │     8    │  │    15    │  │     (阶段2添加)
│ └──────────┘  └──────────┘  │
│                              │
│        心率: -- bpm          │  ← 底部预留信息
├─────────────────────────────┤
│   [暂停]       [结束运动]    │  ← 控制按钮
└─────────────────────────────┘
```

**交互行为**：
- 数据实时更新（响应式绑定）
- 点击"暂停" → 切换到暂停状态
- 点击"结束运动" → 弹出确认对话框 → 切换到结束状态
- 自动暂停触发 → 显示提示 + 振动

#### 状态3：已暂停 (paused)

**变化**：
- 顶部状态栏显示"已暂停"
- 数据停止更新
- 按钮变为："继续" 和 "结束运动"
- 如果是自动暂停，显示提示："已自动暂停（2分钟无动作）"（3秒后消失）

#### 状态4：运动结束 (finished)

**显示内容**：
- 标题："运动完成"
- 数据汇总卡片
  - 运动时长：35分12秒
  - 总挥拍：89次
  - 各类击球：
    - 杀球 23次 (26%)
    - 抽球 15次 (17%)
    - 挑球 31次 (35%)
    - 其他 20次 (22%)
  - 速度统计：
    - 最快速度：156 km/h
    - 平均速度：98 km/h
- 简单图表（阶段3）
  - 击球类型饼图
  - 速度对比条形图
- 操作按钮
  - "查看历史"（主按钮）
  - "开始新运动"（次要按钮）

#### 状态5：历史记录 (history)

**显示内容**：
- 标题："训练历史"
- 记录列表（最近30条，按时间倒序）
  - 每条记录：
    ```
    6月14日 15:30 - 16:05
    时长 35分钟 | 挥拍 89次 | 最快 156 km/h
    ```
  - 点击展开详情（显示完整统计数据）
- 图表区域（阶段3）
  - 折线图：最近10次的最快速度趋势
  - 柱状图：选中记录的击球次数对比
- 底部按钮："开始新运动"

### 3.3 自动暂停机制

**触发条件**：连续2分钟（120秒）无有效挥拍动作

**实现方式**：
1. 在运动中状态每30秒检查一次 `currentTime - lastSwingTime`
2. 如果超过120秒，触发自动暂停

**用户反馈**：
- 切换到暂停状态
- 屏幕中央显示提示："已自动暂停（2分钟无动作）"（3秒淡出）
- 触发振动提醒（vibrator.vibrate, 短振动200ms）

**Why**：避免用户忘记暂停导致数据不准确，但保留手动控制权。

---

## 4. 技术实现细节

### 4.1 文件结构

```
swing/src/
├── manifest.json              # 应用配置（需更新features）
├── app.ux                     # 应用入口
├── common/
│   ├── logo.png              # 应用图标
│   ├── utils.js              # 工具函数
│   │   ├── calculateSpeed()  # 速度计算
│   │   ├── formatTime()      # 时间格式化
│   │   └── formatDate()      # 日期格式化
│   └── constants.js          # 常量配置（阈值等）
├── pages/
│   └── main/
│       └── main.ux           # 主页面（单页流式状态机）
├── components/               # 可选：可复用组件（阶段2/3）
│   ├── stat-card.ux         # 数据卡片组件
│   ├── chart-pie.ux         # 饼图组件
│   └── chart-line.ux        # 折线图组件
└── i18n/                     # 多语言（可保留现有）
    ├── zh-CN.json
    └── en.json
```

### 4.2 关键模块设计

#### SensorManager（传感器管理）

**职责**：管理加速度计订阅、数据处理、击球检测

```javascript
// 伪代码结构
class SensorManager {
  constructor(mode, onSwingDetected) {
    this.mode = mode  // 'standard' | 'professional'
    this.onSwingDetected = onSwingDetected  // 回调函数
    this.lastDetectionTime = 0
    this.thresholds = THRESHOLDS[mode]
  }
  
  subscribe() {
    // 订阅加速度计，interval: "game" (约20ms)
    sensor.subscribeAccelerometer({
      interval: 'game',
      callback: (data) => this.handleData(data)
    })
  }
  
  unsubscribe() {
    sensor.unsubscribeAccelerometer()
  }
  
  handleData({ x, y, z }) {
    // 防抖检查
    const now = Date.now()
    if (now - this.lastDetectionTime < DEBOUNCE_TIME) {
      return
    }
    
    // 计算加速度模
    const magnitude = Math.sqrt(x*x + y*y + z*z)
    
    // 检测击球类型
    const strokeType = this.classifyStroke(x, y, z, magnitude)
    
    if (strokeType) {
      this.lastDetectionTime = now
      const speed = this.calculateSpeed(magnitude)
      this.onSwingDetected(strokeType, speed)
    }
  }
  
  classifyStroke(x, y, z, magnitude) {
    // 实现上文的击球类型识别逻辑
    // 阶段1：只返回 'other'
    // 阶段2：返回 'smash' | 'drive' | 'lift' | 'other'
  }
  
  calculateSpeed(magnitude) {
    return magnitude * 25  // 简化公式
  }
}
```

#### SessionManager（会话管理）

**职责**：管理运动会话状态、计时、数据统计

```javascript
class SessionManager {
  constructor() {
    this.currentSession = null
    this.timer = null
    this.autoPauseTimer = null
  }
  
  startSession(mode) {
    this.currentSession = {
      id: Date.now().toString(),
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      mode: mode,
      stats: {
        totalSwings: 0,
        smash: 0,
        drive: 0,
        lift: 0,
        other: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        currentSpeed: 0,
        heartRate: null
      },
      status: 'running',
      lastSwingTime: Date.now()
    }
    
    this.startTimer()
    this.startAutoPauseCheck()
    return this.currentSession
  }
  
  pauseSession() {
    if (this.currentSession && this.currentSession.status === 'running') {
      this.currentSession.status = 'paused'
      this.stopTimer()
      this.stopAutoPauseCheck()
    }
  }
  
  resumeSession() {
    if (this.currentSession && this.currentSession.status === 'paused') {
      this.currentSession.status = 'running'
      this.currentSession.lastSwingTime = Date.now()  // 重置防止立即暂停
      this.startTimer()
      this.startAutoPauseCheck()
    }
  }
  
  endSession() {
    if (this.currentSession) {
      this.currentSession.status = 'finished'
      this.currentSession.endTime = Date.now()
      this.stopTimer()
      this.stopAutoPauseCheck()
      
      // 计算平均速度
      if (this.currentSession.stats.totalSwings > 0) {
        this.currentSession.stats.avgSpeed = Math.round(
          this.totalSpeed / this.currentSession.stats.totalSwings
        )
      }
      
      return this.currentSession
    }
  }
  
  updateStats(strokeType, speed) {
    if (!this.currentSession || this.currentSession.status !== 'running') {
      return
    }
    
    const stats = this.currentSession.stats
    
    // 更新计数
    stats.totalSwings++
    stats[strokeType]++  // smash/drive/lift/other
    
    // 更新速度
    stats.currentSpeed = speed
    if (speed > stats.maxSpeed) {
      stats.maxSpeed = speed
    }
    this.totalSpeed += speed  // 累加用于平均值
    
    // 更新最后挥拍时间
    this.currentSession.lastSwingTime = Date.now()
  }
  
  startTimer() {
    // 每秒更新 duration
    this.timer = setInterval(() => {
      if (this.currentSession.status === 'running') {
        this.currentSession.duration++
      }
    }, 1000)
  }
  
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
  
  startAutoPauseCheck() {
    // 每30秒检查一次是否需要自动暂停
    this.autoPauseTimer = setInterval(() => {
      this.checkAutoPause()
    }, 30000)
  }
  
  stopAutoPauseCheck() {
    if (this.autoPauseTimer) {
      clearInterval(this.autoPauseTimer)
      this.autoPauseTimer = null
    }
  }
  
  checkAutoPause() {
    if (!this.currentSession || this.currentSession.status !== 'running') {
      return
    }
    
    const now = Date.now()
    const timeSinceLastSwing = now - this.currentSession.lastSwingTime
    
    if (timeSinceLastSwing > 120000) {  // 2分钟 = 120000ms
      this.pauseSession()
      return { autoPaused: true }
    }
    
    return { autoPaused: false }
  }
}
```

#### StorageManager（数据存储）

**职责**：本地数据持久化、历史记录管理

```javascript
import storage from '@system.storage'

class StorageManager {
  static STORAGE_KEY = 'badminton_sessions'
  static MAX_HISTORY = 30
  
  static saveSession(session) {
    return new Promise((resolve, reject) => {
      // 读取现有历史
      this.loadHistory().then(history => {
        // 添加新会话
        history.unshift(session)  // 添加到开头
        
        // 保持最多30条
        if (history.length > this.MAX_HISTORY) {
          history = history.slice(0, this.MAX_HISTORY)
        }
        
        // 保存
        storage.set({
          key: this.STORAGE_KEY,
          value: JSON.stringify(history),
          success: () => resolve(history),
          fail: (data, code) => reject({ data, code })
        })
      })
    })
  }
  
  static loadHistory() {
    return new Promise((resolve) => {
      storage.get({
        key: this.STORAGE_KEY,
        success: (data) => {
          try {
            const history = JSON.parse(data)
            resolve(Array.isArray(history) ? history : [])
          } catch (e) {
            resolve([])
          }
        },
        fail: () => resolve([])
      })
    })
  }
  
  static deleteSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.loadHistory().then(history => {
        const filtered = history.filter(s => s.id !== sessionId)
        
        storage.set({
          key: this.STORAGE_KEY,
          value: JSON.stringify(filtered),
          success: () => resolve(filtered),
          fail: (data, code) => reject({ data, code })
        })
      })
    })
  }
  
  static clearAllHistory() {
    return new Promise((resolve, reject) => {
      storage.delete({
        key: this.STORAGE_KEY,
        success: () => resolve(),
        fail: (data, code) => reject({ data, code })
      })
    })
  }
}
```

### 4.3 主页面状态管理（main.ux）

```javascript
// main.ux 中的 data 结构
export default {
  data: {
    // 应用状态
    appState: 'idle',  // 'idle' | 'running' | 'paused' | 'finished' | 'history'
    
    // 模式选择
    mode: 'standard',  // 'standard' | 'professional'
    
    // 当前会话
    session: null,
    
    // 历史记录
    history: [],
    
    // UI 状态
    showAutoPauseHint: false,
    selectedHistoryItems: []  // 用于对比的选中记录
  },
  
  // 生命周期
  onInit() {
    this.loadHistory()
  },
  
  onShow() {
    // 检查是否有未完成的会话（应用恢复）
    this.checkUnfinishedSession()
  },
  
  onHide() {
    // 暂停传感器（省电）
    if (this.sensorManager) {
      this.sensorManager.unsubscribe()
    }
  },
  
  // 主要方法
  startWorkout() {
    this.appState = 'running'
    this.sessionManager = new SessionManager()
    this.session = this.sessionManager.startSession(this.mode)
    
    this.sensorManager = new SensorManager(
      this.mode,
      (strokeType, speed) => this.handleSwingDetected(strokeType, speed)
    )
    this.sensorManager.subscribe()
  },
  
  pauseWorkout() {
    this.sessionManager.pauseSession()
    this.appState = 'paused'
  },
  
  resumeWorkout() {
    this.sessionManager.resumeSession()
    this.appState = 'running'
  },
  
  endWorkout() {
    // 弹出确认对话框
    prompt.showDialog({
      title: '结束运动',
      message: '确定要结束本次运动吗？',
      buttons: [
        { text: '取消' },
        { text: '确定', color: '#09ba07' }
      ],
      success: (data) => {
        if (data.index === 1) {
          this.session = this.sessionManager.endSession()
          this.sensorManager.unsubscribe()
          this.appState = 'finished'
          
          // 保存到历史
          StorageManager.saveSession(this.session).then(history => {
            this.history = history
          })
        }
      }
    })
  },
  
  handleSwingDetected(strokeType, speed) {
    // 更新会话统计
    this.sessionManager.updateStats(strokeType, speed)
    
    // 触发界面更新（响应式绑定）
    this.session = { ...this.session }
    
    // 检查自动暂停（节流，避免每次都检查）
    const result = this.sessionManager.checkAutoPause()
    if (result.autoPaused) {
      this.handleAutoPause()
    }
  },
  
  handleAutoPause() {
    this.appState = 'paused'
    this.showAutoPauseHint = true
    
    // 振动提醒
    vibrator.vibrate({ duration: 200 })
    
    // 3秒后隐藏提示
    setTimeout(() => {
      this.showAutoPauseHint = false
    }, 3000)
  },
  
  viewHistory() {
    this.appState = 'history'
  },
  
  startNewWorkout() {
    this.appState = 'idle'
  },
  
  loadHistory() {
    StorageManager.loadHistory().then(history => {
      this.history = history
    })
  }
}
```

### 4.4 manifest.json 配置更新

```json
{
  "package": "com.application.watch.badminton",
  "name": "羽毛球运动",
  "versionName": "1.0.0",
  "versionCode": 1,
  "minPlatformVersion": 1000,
  "icon": "/common/logo.png",
  "deviceTypeList": ["watch"],
  "features": [
    { "name": "system.router" },
    { "name": "system.sensor" },
    { "name": "system.storage" },
    { "name": "system.vibrator" },
    { "name": "system.prompt" }
  ],
  "config": {
    "logLevel": "log",
    "designWidth": "device-width"
  },
  "router": {
    "entry": "pages/main",
    "pages": {
      "pages/main": {
        "component": "main"
      }
    }
  }
}
```

### 4.5 关键技术点

#### 1. 性能优化

**传感器数据节流**
```javascript
// 传感器回调频率：20ms (game mode)
// UI更新频率：限制为 100ms

let lastUIUpdate = 0
const UI_UPDATE_INTERVAL = 100

handleData(data) {
  // 处理数据检测...
  
  const now = Date.now()
  if (now - lastUIUpdate > UI_UPDATE_INTERVAL) {
    this.updateUI()  // 触发界面更新
    lastUIUpdate = now
  }
}
```

**Why**：避免过于频繁的UI更新导致性能问题和界面卡顿。

#### 2. 错误处理

**传感器不可用**
```javascript
sensor.subscribeAccelerometer({
  interval: 'game',
  callback: (data) => this.handleData(data),
  fail: (data, code) => {
    prompt.showToast({
      message: '加速度计不可用，请检查设备',
      duration: 3000
    })
    // 禁用"开始运动"按钮
    this.sensorAvailable = false
  }
})
```

**存储失败处理**
```javascript
StorageManager.saveSession(session).catch(error => {
  prompt.showDialog({
    title: '存储失败',
    message: '存储空间可能不足，是否清理旧记录？',
    buttons: [
      { text: '取消' },
      { text: '清理', color: '#ff5722' }
    ],
    success: (data) => {
      if (data.index === 1) {
        // 删除最旧的5条记录
        this.history = this.history.slice(0, 25)
        // 重试保存
        StorageManager.saveSession(session)
      }
    }
  })
})
```

**应用恢复处理**
```javascript
// 检测应用异常退出导致的未完成会话
checkUnfinishedSession() {
  storage.get({
    key: 'current_session_temp',
    success: (data) => {
      const session = JSON.parse(data)
      if (session && session.status !== 'finished') {
        prompt.showDialog({
          title: '恢复运动',
          message: '检测到未完成的运动，是否继续？',
          buttons: [
            { text: '放弃' },
            { text: '继续' }
          ],
          success: (result) => {
            if (result.index === 1) {
              this.session = session
              this.appState = 'paused'
              // 恢复传感器和计时器
              this.resumeWorkout()
            } else {
              // 标记为结束并保存
              session.status = 'finished'
              session.endTime = Date.now()
              StorageManager.saveSession(session)
              storage.delete({ key: 'current_session_temp' })
            }
          }
        })
      }
    }
  })
}

// 运动过程中持续保存临时状态
saveCurrentSessionTemp() {
  if (this.session) {
    storage.set({
      key: 'current_session_temp',
      value: JSON.stringify(this.session)
    })
  }
}
```

---

## 5. 图表设计、测试与扩展

### 5.1 历史记录图表设计（阶段3）

#### 图表类型选择

考虑到手表屏幕尺寸限制（通常小于2英寸），选择简洁清晰的图表：

**1. 运动结束统计页**

- **击球类型饼图**
  - 展示杀球/抽球/挑球/其他的占比
  - 颜色：杀球(红#f44336)、抽球(橙#ff9800)、挑球(蓝#2196f3)、其他(灰#9e9e9e)
  - 中心显示总挥拍数

- **速度对比条形图**
  - 横向条形图，最快速度 vs 平均速度
  - 颜色：最快(绿#09ba07)、平均(灰#bdbdbd)
  - 显示具体数值

**2. 历史记录对比页**

- **速度趋势折线图**
  - 横轴：日期（最近10次）
  - 纵轴：速度 (km/h)
  - 两条线：最快速度、平均速度

- **击球次数柱状图**
  - 横轴：击球类型
  - 纵轴：次数
  - 分组柱状图（可选择2-3次记录对比）

#### 图表实现方式

使用 **Canvas 组件** 绘制：

```html
<!-- 示例：饼图组件 -->
<template>
  <div class="chart-container">
    <canvas id="pieChart" style="width: 200px; height: 200px;"></canvas>
  </div>
</template>

<script>
export default {
  props: ['data'],  // { smash: 23, drive: 15, lift: 31, other: 20 }
  
  onReady() {
    const canvas = this.$element('pieChart')
    const ctx = canvas.getContext('2d')
    this.drawPieChart(ctx, this.data)
  },
  
  drawPieChart(ctx, data) {
    const total = data.smash + data.drive + data.lift + data.other
    const colors = {
      smash: '#f44336',
      drive: '#ff9800',
      lift: '#2196f3',
      other: '#9e9e9e'
    }
    
    let startAngle = 0
    Object.keys(data).forEach(key => {
      const angle = (data[key] / total) * Math.PI * 2
      
      ctx.beginPath()
      ctx.moveTo(100, 100)
      ctx.arc(100, 100, 80, startAngle, startAngle + angle)
      ctx.closePath()
      ctx.fillStyle = colors[key]
      ctx.fill()
      
      startAngle += angle
    })
  }
}
</script>
```

**Why**：Canvas 性能好，适合手表小屏幕，且 Vela 快应用支持基本 Canvas API。

### 5.2 数据校准与优化

#### 阈值微调建议

**初始测试**：
1. 使用标准模式进行50-100次实际挥拍测试
2. 记录误判情况：
   - 误报（非挥拍被识别）
   - 漏报（真实挥拍未识别）
   - 类型错误（杀球识别为抽球等）

**调整策略**：
- 误报率高 → 提高 `swingThreshold`
- 漏报率高 → 降低阈值或优化防抖时间
- 类型混淆 → 调整方向判断系数（0.6, 0.4, 0.5）

**专业模式校准**：
- 基于标准模式的阈值 × 1.2
- 可根据专业球员反馈进一步调整

#### 性能优化清单

- [x] 传感器数据节流（UI更新间隔100ms）
- [x] 防抖去重（200ms内同一挥拍）
- [x] 历史记录上限（30条自动清理）
- [x] 图表延迟加载（只在需要时绘制）
- [ ] 长会话优化（超过1小时的运动，考虑分段保存）

### 5.3 测试策略

#### 阶段1测试重点

**功能测试**：
- [ ] 基础流程：开始 → 暂停 → 继续 → 结束
- [ ] 挥拍检测：标准动作识别率 > 90%
- [ ] 数据持久化：保存和读取正确
- [ ] 模式切换：标准/专业阈值生效

**性能测试**：
- [ ] 界面响应：数据更新无明显延迟 (< 100ms)
- [ ] 传感器订阅：无内存泄漏，长时间运行稳定
- [ ] 存储性能：保存30条记录 < 500ms

**边界测试**：
- [ ] 快速连续挥拍（防抖是否有效）
- [ ] 超长运动时间（2小时+）
- [ ] 应用切换/锁屏恢复

#### 阶段2测试重点

**功能测试**：
- [ ] 击球类型识别准确率：
  - 杀球识别率 > 85%
  - 抽球识别率 > 80%
  - 挑球识别率 > 80%
- [ ] 速度计算合理性（与实际感受对比）
- [ ] 统计页面数据一致性

**用户体验测试**：
- [ ] 两档模式区分度明显
- [ ] 运动结束统计页信息完整
- [ ] 交互流畅无卡顿

#### 阶段3测试重点

**功能测试**：
- [ ] 自动暂停：2分钟触发准确，振动反馈有效
- [ ] 历史管理：30条上限自动清理正确
- [ ] 图表渲染：数据正确，性能良好
- [ ] 记录对比：多选记录对比功能正常

**稳定性测试**：
- [ ] 连续多日使用无数据丢失
- [ ] 满历史记录（30条）下性能稳定
- [ ] 异常退出恢复机制有效

**真实场景测试**：
- [ ] 实际羽毛球场地测试（完整30分钟+运动）
- [ ] 不同用户体型和力量测试（阈值适应性）
- [ ] 不同强度运动（娱乐/训练/比赛）

### 5.4 未来扩展预留

#### 1. 心率接入

**预留接口**：
```javascript
// SensorManager 中预留方法
subscribeHeartRate() {
  // 待小米Vela提供心率API时实现
  heartRateSensor.subscribe({
    callback: (data) => {
      this.session.stats.heartRate = data.heartRate
    }
  })
}
```

**UI已预留**：运动中页面底部显示 `心率: -- bpm`

#### 2. 数据导出

**实现思路**：
```javascript
exportSession(sessionId) {
  const session = this.history.find(s => s.id === sessionId)
  const json = JSON.stringify(session, null, 2)
  
  // 可能的实现方式：
  // 1. 保存到文件系统 (system.file)
  // 2. 生成二维码扫描导出
  // 3. 蓝牙传输到手机 (system.bluetooth)
}
```

#### 3. 社交分享

**运动报告卡片**：
- 生成图片（Canvas绘制）
- 包含：运动数据、图表、日期、应用品牌
- 保存到相册或分享

#### 4. 训练计划与目标

**智能建议**：
```javascript
analyzePerformance(history) {
  // 基于历史数据分析
  const avgSwingsPerSession = history.reduce(...) / history.length
  const speedTrend = calculateTrend(history.map(s => s.stats.maxSpeed))
  
  // 生成建议
  if (speedTrend < 0) {
    return "建议增加力量训练"
  } else if (avgSwingsPerSession < 60) {
    return "建议延长训练时长"
  }
  // ...
}
```

**目标设置**：
- 用户设定目标（如"每周训练3次"、"最快速度突破150"）
- 应用提供进度跟踪和提醒

#### 5. 多人对战模式

**概念**：
- 蓝牙连接另一块手表
- 实时同步双方数据
- 对战结束显示对比统计

---

## 6. 总结

### 核心价值
本应用通过手表内置加速度传感器实现羽毛球运动的自动追踪，解决了传统运动记录需要手动输入的痛点，为羽毛球爱好者提供了便捷的数据分析工具。

### 技术亮点
1. **智能识别**：基于加速度三轴数据和阈值算法自动识别多种击球类型
2. **混合控制**：结合手动控制和自动暂停，平衡易用性和准确性
3. **渐进开发**：三阶段迭代降低风险，每阶段都有可用成果
4. **单页流式**：符合运动流程的状态机设计，减少导航复杂度

### 开发优先级
- **阶段1（MVP）**：2-3周，实现核心流程和基础检测
- **阶段2（进阶）**：2周，完善击球分类和统计功能
- **阶段3（完整）**：1-2周，添加历史分析和自动化功能

### 风险与应对
1. **传感器精度不足** → 通过实测数据调优阈值，提供两档模式适应不同用户
2. **误判率较高** → 采用防抖、方向判断等多重策略，阶段性迭代优化算法
3. **性能问题** → 数据节流、延迟加载图表、限制历史记录数量
4. **心率API缺失** → 界面预留位置，待API开放后快速集成

---

## 附录

### A. 相关API文档链接
- 小米Vela快应用开发指南：https://iot.mi.com/vela/quickapp/zh/guide/
- 传感器API：https://iot.mi.com/vela/quickapp/zh/features/system/sensor.html
- 系统能力API：https://iot.mi.com/vela/quickapp/zh/features/system/

### B. 常量配置参考
```javascript
// constants.js
export const THRESHOLDS = { /* 见2.2节 */ }
export const DEBOUNCE_TIME = 200  // ms
export const AUTO_PAUSE_TIMEOUT = 120000  // 2分钟
export const AUTO_PAUSE_CHECK_INTERVAL = 30000  // 30秒
export const UI_UPDATE_INTERVAL = 100  // ms
export const MAX_HISTORY = 30
export const SPEED_COEFFICIENT = 25  // 速度计算系数

export const COLORS = {
  smash: '#f44336',
  drive: '#ff9800',
  lift: '#2196f3',
  other: '#9e9e9e'
}

export const STROKE_LABELS = {
  smash: '杀球',
  drive: '抽球',
  lift: '挑球',
  other: '其他'
}
```

### C. 设计决策记录

| 决策 | 原因 |
|------|------|
| 单页流式状态机 | 符合运动使用流程，减少导航层级 |
| 平衡卡片式布局 | 所有数据同屏显示，信息层级清晰 |
| 两档模式而非可调节 | 简化用户操作，避免配置复杂度 |
| 2分钟自动暂停 | 平衡自动化和用户控制，避免数据污染 |
| 30条历史上限 | 手表存储空间有限，保留近期数据即可 |
| 基于方向的击球分类 | 利用三轴加速度区分发力方向，无需额外传感器 |
| 渐进式三阶段开发 | 降低风险，快速验证核心功能，便于迭代优化 |

---

**文档版本**：v1.0  
**最后更新**：2026-06-15  
**状态**：Phase 1 完成
