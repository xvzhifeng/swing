# Phase 2: Stroke Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stroke type classification (smash, drive, lift, clear) to badminton tracking app based on accelerometer direction analysis.

**Architecture:** Create StrokeClassifier class for direction-based classification, integrate into existing SensorManager, extend SessionManager stats model, update UI to display stroke type counts.

**Tech Stack:** Xiaomi Vela QuickApp, ES6 modules, @system.sensor API

---

## File Structure

**New Files:**
- `common/strokeClassifier.js` - StrokeClassifier class (pure classification logic)

**Modified Files:**
- `common/constants.js` - Add DIRECTION_COEFFICIENTS
- `pages/main/index.ux` - Update SensorManager, SessionManager, StorageManager, UI templates

**Test Approach:**
- Manual testing with "测试挥拍" button in simulator
- Real device testing for threshold adjustment
- Console logging for verification

---

## Task 1: Add Direction Coefficients to Constants

**Files:**
- Modify: `common/constants.js`

- [ ] **Step 1: Add DIRECTION_COEFFICIENTS constant**

在 `constants.js` 末尾添加（COLORS 对象之后）：

```javascript
// Direction analysis coefficients for stroke classification (Phase 2)
export const DIRECTION_COEFFICIENTS = {
  smashZ: -0.6,      // Smash: z/magnitude < -0.6 (downward)
  driveZ: 0.4,       // Drive: |z/magnitude| < 0.4 (horizontal)
  liftZ: 0.5,        // Lift: z/magnitude > 0.5 (upward)
  clearMinMag: 3.5,  // Clear: minimum magnitude (g) for powerful upward stroke
  clearMaxZ: 0.8     // Clear: maximum z ratio (not too steep)
}
```

- [ ] **Step 2: Verify export**

检查文件确保导出语法正确，常量对象格式无误。

- [ ] **Step 3: Commit**

```bash
cd C:/code/01-practice/swing/swing/src
git add common/constants.js
git commit -m "feat(phase2): add direction coefficients for stroke classification

- Add DIRECTION_COEFFICIENTS with smash/drive/lift/clear thresholds
- smashZ: -0.6 for downward strokes
- driveZ: 0.4 for horizontal strokes
- liftZ: 0.5 for upward strokes
- clearMinMag: 3.5g and clearMaxZ: 0.8 for powerful clears"
```

---

## Task 2: Create StrokeClassifier Class

**Files:**
- Create: `common/strokeClassifier.js`

- [ ] **Step 1: Create file with imports**

创建 `common/strokeClassifier.js` 文件：

```javascript
/**
 * StrokeClassifier - Classifies badminton strokes based on accelerometer direction
 * 
 * Phase 2 Feature: Analyzes x, y, z acceleration data to identify:
 * - Smash (downward)
 * - Drive (horizontal)
 * - Lift (gentle upward)
 * - Clear (powerful upward)
 * - Other (valid swing but doesn't match patterns)
 */

import { THRESHOLDS, DIRECTION_COEFFICIENTS } from './constants.js'

```

- [ ] **Step 2: Add StrokeClassifier class with constructor**

在 imports 之后添加：

```javascript
class StrokeClassifier {
  /**
   * @param {string} mode - 'standard' or 'professional'
   */
  constructor(mode = 'standard') {
    this.mode = mode
    this.threshold = THRESHOLDS[mode].swingThreshold
    console.log(`StrokeClassifier initialized in ${mode} mode, threshold=${this.threshold}g`)
  }
```

- [ ] **Step 3: Add classify method**

在 constructor 之后添加：

```javascript
  /**
   * Classify stroke type based on acceleration data
   * 
   * @param {number} x - X-axis acceleration
   * @param {number} y - Y-axis acceleration
   * @param {number} z - Z-axis acceleration (positive = upward)
   * @param {number} magnitude - Acceleration magnitude (√(x²+y²+z²))
   * @returns {string|null} Stroke type or null if not a valid swing
   */
  classify(x, y, z, magnitude) {
    // Layer 1: Check if it's a valid swing
    if (magnitude < this.threshold) {
      return null  // Not a valid swing
    }
    
    // Layer 2: Analyze direction
    const zRatio = z / magnitude
    const { smashZ, driveZ, liftZ, clearMinMag, clearMaxZ } = DIRECTION_COEFFICIENTS
    
    // Priority-based classification
    if (zRatio < smashZ) {
      // Downward stroke with >60% z component
      return 'smash'
    } else if (Math.abs(zRatio) < driveZ) {
      // Horizontal stroke with <40% z component
      return 'drive'
    } else if (magnitude >= clearMinMag && zRatio > liftZ && zRatio < clearMaxZ) {
      // Powerful upward stroke (50%-80% z component, magnitude >= 3.5g)
      return 'clear'
    } else if (zRatio > liftZ) {
      // Upward stroke but not powerful enough for clear
      return 'lift'
    } else {
      // Valid swing but doesn't match known patterns
      return 'other'
    }
  }
```

- [ ] **Step 4: Add updateMode method**

在 classify 方法之后添加：

```javascript
  /**
   * Update threshold when mode changes
   * 
   * @param {string} mode - 'standard' or 'professional'
   */
  updateMode(mode) {
    this.mode = mode
    this.threshold = THRESHOLDS[mode].swingThreshold
    console.log(`StrokeClassifier mode updated to ${mode}, threshold=${this.threshold}g`)
  }
}
```

- [ ] **Step 5: Add export**

在文件末尾添加：

```javascript

export default StrokeClassifier
```

- [ ] **Step 6: Verify file completeness**

检查文件：
- import 语句正确
- class 定义完整
- 所有方法都有注释
- export 语句在末尾

- [ ] **Step 7: Commit**

```bash
git add common/strokeClassifier.js
git commit -m "feat(phase2): create StrokeClassifier class

- Add classify() method with 2-layer logic:
  - Layer 1: valid swing threshold check
  - Layer 2: direction analysis (smash/drive/lift/clear)
- Add updateMode() for threshold adjustment
- Pure logic class, no state beyond threshold"
```

---

## Task 3: Update SessionManager Data Model

**Files:**
- Modify: `pages/main/index.ux` - SessionManager class

- [ ] **Step 1: Locate SessionManager.createSession method**

在 `index.ux` 中找到 `createSession(mode = 'standard')` 方法（约第 287 行）。

- [ ] **Step 2: Update stats initialization**

修改 `stats` 对象初始化：

```javascript
      stats: {
        totalSwings: 0,
        smash: 0,         // Phase 2: Smash count
        drive: 0,         // Phase 2: Drive count
        lift: 0,          // Phase 2: Lift count
        clear: 0,         // Phase 2: Clear count
        other: 0,         // Phase 2: Other valid swings
        maxSpeed: 0,
        avgSpeed: 0,
        currentSpeed: 0,
        heartRate: null
      },
```

- [ ] **Step 3: Add version field**

在 `stats` 对象之后添加 `version` 字段：

```javascript
      version: 2,        // Phase 2: Data version for compatibility
      isActive: true,
```

- [ ] **Step 4: Locate SessionManager.recordSwing method**

找到当前的 `recordSwing(magnitude, speed)` 方法（如果存在）或在 SessionManager 类中添加。

- [ ] **Step 5: Replace recordSwing method signature and implementation**

完整替换为：

```javascript
  /**
   * Record a swing with stroke type (Phase 2)
   * @param {string} type - Stroke type ('smash'|'drive'|'lift'|'clear'|'other')
   * @param {number} speed - Speed in km/h
   */
  recordSwing(type, speed) {
    if (!this.session) {
      console.error('Cannot record swing: no active session')
      return
    }
    
    // Update stroke type count
    this.session.stats[type]++
    this.session.stats.totalSwings++
    
    // Update speed statistics
    this.session.stats.currentSpeed = speed
    if (speed > this.session.stats.maxSpeed) {
      this.session.stats.maxSpeed = speed
    }
    
    // Accumulate speed for average calculation
    this.totalSpeed += speed
    this.session.stats.avgSpeed = Math.round(
      this.totalSpeed / this.session.stats.totalSwings
    )
    
    // Update last swing time (for auto-pause feature)
    this.session.lastSwingTime = Date.now()
    
    console.log(`Recorded ${type}: total=${this.session.stats.totalSwings}, ${type}=${this.session.stats[type]}, avg=${this.session.stats.avgSpeed}km/h`)
  }
```

- [ ] **Step 6: Verify totalSpeed field exists in constructor**

检查 `SessionManager` 的 `constructor()` 确保有 `this.totalSpeed = 0`。如果没有，添加在 `this.session = null` 之后。

- [ ] **Step 7: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): update SessionManager data model for stroke types

- Add smash/drive/lift/clear/other fields to stats
- Add version: 2 field for data compatibility
- Update recordSwing() to accept stroke type parameter
- Calculate avgSpeed from accumulated totalSpeed"
```

---

## Task 4: Integrate StrokeClassifier into SensorManager

**Files:**
- Modify: `pages/main/index.ux` - SensorManager class

- [ ] **Step 1: Add import at top of script section**

在 `<script>` 标签之后的 import 语句中添加（在其他 common imports 附近）：

```javascript
import StrokeClassifier from '../../common/strokeClassifier.js'
```

- [ ] **Step 2: Locate SensorManager constructor**

找到 `SensorManager` 的 `constructor(mode, swingCallback)` 方法（约第 458 行）。

- [ ] **Step 3: Add classifier instance to constructor**

在 `this.swingCallback = swingCallback` 之后添加：

```javascript
    this.classifier = new StrokeClassifier(mode)  // Phase 2: Stroke classifier
```

- [ ] **Step 4: Locate handleSensorData method**

找到 `handleSensorData(data)` 方法（约第 513 行）。

- [ ] **Step 5: Update handleSensorData to use classifier**

完整替换 `handleSensorData` 方法：

```javascript
  /**
   * Handle sensor data and detect strokes (Phase 2: with classification)
   * @param {Object} data - Sensor data {x, y, z}
   */
  handleSensorData(data) {
    const { x, y, z } = data
    const magnitude = calculateMagnitude(x, y, z)

    // Classify stroke type using classifier
    const strokeType = this.classifier.classify(x, y, z, magnitude)
    
    if (strokeType) {
      const now = Date.now()

      // Debounce: ignore if within DEBOUNCE_TIME of last swing
      if (now - this.lastSwingTime < DEBOUNCE_TIME) {
        return
      }

      this.lastSwingTime = now
      const speed = calculateSpeed(magnitude, SPEED_COEFFICIENT)

      console.log(`${strokeType} detected! magnitude=${magnitude.toFixed(2)}g, speed=${speed}km/h, zRatio=${(z/magnitude).toFixed(2)}`)

      // Trigger callback with stroke type and speed
      if (this.swingCallback) {
        this.swingCallback(strokeType, speed)
      }
    }
  }
```

- [ ] **Step 6: Update updateThreshold method**

找到 `updateThreshold(mode)` 方法，确保它也更新分类器：

```javascript
  /**
   * Update threshold based on mode (Phase 2: also updates classifier)
   * @param {string} mode - 'standard' or 'professional'
   */
  updateThreshold(mode) {
    this.currentThreshold = THRESHOLDS[mode].swingThreshold
    this.classifier.updateMode(mode)  // Phase 2: Update classifier mode
    console.log(`Threshold updated to ${this.currentThreshold} for ${mode} mode`)
  }
```

- [ ] **Step 7: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): integrate StrokeClassifier into SensorManager

- Import and instantiate StrokeClassifier in constructor
- Update handleSensorData() to call classifier.classify()
- Pass stroke type to callback instead of magnitude
- Update updateThreshold() to sync classifier mode
- Add zRatio logging for debugging"
```

---

## Task 5: Update Main Page Swing Handler

**Files:**
- Modify: `pages/main/index.ux` - export default onSwingDetected method

- [ ] **Step 1: Locate startWorkout method**

在 `export default` 部分找到 `startWorkout()` 方法（约第 700 行）。

- [ ] **Step 2: Find SensorManager callback definition**

在 `startWorkout` 方法中找到传递给 `SensorManager` 的回调函数（类似 `(magnitude, speed) => { ... }`）。

- [ ] **Step 3: Update callback signature**

修改回调函数参数从 `(magnitude, speed)` 改为 `(type, speed)`：

```javascript
    // Subscribe to sensor with callback (Phase 2: receives stroke type)
    this.sensorManager.subscribe((type, speed) => {
      console.log(`Swing callback: ${type}, ${speed}km/h`)
      
      // Record swing with type
      if (this.sessionManager) {
        this.sessionManager.recordSwing(type, speed)
        
        // Update UI
        this.session = this.sessionManager.getSession()
        this.$set('session', { ...this.session })
      }
      
      // Vibrate feedback
      vibrator.vibrate({
        mode: 'short'
      })
    })
```

- [ ] **Step 4: Verify no other references to old signature**

搜索 `index.ux` 中是否有其他地方调用 `recordSwing` 的旧签名，如果有则更新。

- [ ] **Step 5: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): update swing callback to handle stroke types

- Change callback signature from (magnitude, speed) to (type, speed)
- Pass stroke type to SessionManager.recordSwing()
- Remove magnitude parameter (no longer needed)"
```

---

## Task 6: Update Test Swing Function

**Files:**
- Modify: `pages/main/index.ux` - testSwing method

- [ ] **Step 1: Locate testSwing method**

在 `export default` 部分找到 `testSwing()` 方法（约第 820 行）。

- [ ] **Step 2: Replace testSwing implementation**

完整替换为：

```javascript
  /**
   * Test swing (Phase 2: random stroke types for simulator testing)
   */
  testSwing() {
    if (this.appState !== 'running') {
      console.log('Cannot test swing - not in running state')
      return
    }

    console.log('Test swing triggered')

    // Randomly generate stroke type
    const types = ['smash', 'drive', 'lift', 'clear']
    const randomType = types[Math.floor(Math.random() * types.length)]
    
    // Generate speed based on stroke type characteristics
    let randomSpeed
    switch(randomType) {
      case 'smash':
        randomSpeed = Math.floor(Math.random() * 40) + 80  // 80-120 km/h (fast)
        break
      case 'drive':
        randomSpeed = Math.floor(Math.random() * 40) + 60  // 60-100 km/h (medium-fast)
        break
      case 'clear':
        randomSpeed = Math.floor(Math.random() * 40) + 70  // 70-110 km/h (medium-fast)
        break
      case 'lift':
        randomSpeed = Math.floor(Math.random() * 40) + 40  // 40-80 km/h (slow)
        break
      default:
        randomSpeed = Math.floor(Math.random() * 60) + 50  // 50-110 km/h
    }

    // Record swing with type
    if (this.sessionManager) {
      this.sessionManager.recordSwing(randomType, randomSpeed)

      // Update UI
      this.session = this.sessionManager.getSession()
      this.$set('session', { ...this.session })

      // Vibrate feedback
      vibrator.vibrate({
        mode: 'short'
      })

      console.log(`Test ${randomType} recorded: ${randomSpeed} km/h`)
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): update test swing to generate random stroke types

- Randomly select from smash/drive/lift/clear
- Generate realistic speed ranges per type:
  - Smash: 80-120 km/h
  - Drive: 60-100 km/h
  - Clear: 70-110 km/h
  - Lift: 40-80 km/h
- Pass stroke type to recordSwing()"
```

---

## Task 7: Update Running State UI - Top Row

**Files:**
- Modify: `pages/main/index.ux` - template section (Running State)

- [ ] **Step 1: Locate Running State top card-row**

在 `<template>` 中找到 Running State 的第一个 `<div class="card-row">`（约第 43 行）。

- [ ] **Step 2: Replace top row cards**

替换整个 top card-row：

```html
        <!-- Top row: Smash and Drive -->
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
```

- [ ] **Step 3: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): update running UI top row with smash/drive counts

- Replace placeholder cards with real smash and drive counts
- Bind to session.stats.smash and session.stats.drive
- Remove '(阶段2)' placeholders"
```

---

## Task 8: Update Running State UI - Bottom Row

**Files:**
- Modify: `pages/main/index.ux` - template section (Running State)

- [ ] **Step 1: Locate Running State bottom card-row**

在 `<template>` 中找到 Running State 的第二个 `<div class="card-row">`（约第 64 行）。

- [ ] **Step 2: Replace bottom row cards**

替换整个 bottom card-row：

```html
        <!-- Bottom row: Lift and Clear -->
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

- [ ] **Step 3: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): update running UI bottom row with lift/clear counts

- Replace placeholder cards with real lift and clear counts
- Bind to session.stats.lift and session.stats.clear
- Complete 4-type display layout"
```

---

## Task 9: Update Finished State UI with Stroke Type Breakdown

**Files:**
- Modify: `pages/main/index.ux` - template and style sections (Finished State)

- [ ] **Step 1: Locate Finished State summary-card**

在 `<template>` 中找到 Finished State 的 `<div class="summary-card">`（约第 110 行）。

- [ ] **Step 2: Add stroke type breakdown rows**

在 "总挥拍" row 之后、"最快速度" row 之前添加：

```html
        <div class="summary-row">
          <text class="summary-label">总挥拍</text>
          <text class="summary-value">{{session ? session.stats.totalSwings : 0}}次</text>
        </div>
        
        <!-- Stroke type breakdown -->
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
```

- [ ] **Step 3: Add sub-row styles**

在 `<style>` 部分找到 `.summary-value` 样式之后添加：

```css
.summary-sub {
  margin-bottom: 8px;
}

.summary-label-sub {
  font-size: 12px;
  color: #777777;
  flex: 1;
  text-align: left;
}

.summary-value-sub {
  font-size: 13px;
  color: #cccccc;
  text-align: right;
  flex: 1;
}
```

- [ ] **Step 4: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): add stroke type breakdown to finished UI

- Add 4 sub-rows showing smash/drive/lift/clear counts
- Use tree-style indentation (├ and └) for visual hierarchy
- Add summary-sub, summary-label-sub, summary-value-sub styles
- Maintain collapsed view with smaller font and subdued colors"
```

---

## Task 10: Add Version Check to StorageManager

**Files:**
- Modify: `pages/main/index.ux` - StorageManager class

- [ ] **Step 1: Locate StorageManager.loadHistory method**

在 `StorageManager` 类中找到 `static loadHistory()` 方法（约第 184 行）。

- [ ] **Step 2: Add version check logic**

在 success 回调的 `if (Array.isArray(history))` 判断之后，`resolve(history)` 之前添加：

```javascript
            if (Array.isArray(history)) {
              console.log(`Loaded ${history.length} sessions from history`)
              
              // Phase 2: Check for old version data (v1 or no version)
              const hasOldData = history.some(session => !session.version || session.version < 2)
              
              if (hasOldData) {
                console.log('Detected old version data (v1), clearing history for Phase 2 compatibility')
                // Clear old data
                storage.delete({
                  key: STORAGE_KEY,
                  success: () => console.log('Old history cleared successfully'),
                  fail: (data, code) => console.error('Failed to clear old history:', code)
                })
                resolve([])  // Return empty history
              } else {
                console.log('All sessions are v2, loading normally')
                resolve(history)
              }
            } else {
```

- [ ] **Step 3: Commit**

```bash
git add pages/main/index.ux
git commit -m "feat(phase2): add version check to clear v1 history data

- Check for sessions without version field or version < 2
- Clear old data if found (breaking change for Phase 2)
- Log version detection for debugging
- Return empty array if old data cleared"
```

---

## Task 11: Integration Test - Simulator

**Files:**
- Test: `pages/main/index.ux` (manual testing)

- [ ] **Step 1: Start app in simulator**

运行命令：
```bash
cd C:/code/01-practice/swing/swing
npm run start
```

等待编译完成，在模拟器中打开应用。

- [ ] **Step 2: Test basic flow**

1. 点击"开始运动"
2. 观察运动中界面是否显示 4 种类型（杀球、抽球、挑球、高远球）
3. 初始值应该都是 0

预期：界面正常，4 个小卡片显示类型名称和 0 次。

- [ ] **Step 3: Test stroke recording**

点击"测试挥拍"按钮 20 次，观察：
1. 各类型计数是否增加
2. 是否有随机分布（不是所有挥拍都算作同一类型）
3. 当前速度是否更新
4. 最快速度是否正确记录

预期：
- 4 种类型都有计数（大约各 5 次左右）
- 总挥拍 = smash + drive + lift + clear（忽略 other 类型）
- 速度显示正常

- [ ] **Step 4: Test pause/resume**

1. 点击"暂停"
2. 尝试点击"测试挥拍"（应该无反应）
3. 点击"继续"
4. 再次点击"测试挥拍"（应该正常工作）

预期：暂停时测试按钮无效，继续后恢复。

- [ ] **Step 5: Test finish and summary**

1. 点击"结束运动"
2. 观察完成页面是否显示：
   - 运动时长
   - 总挥拍次数
   - 4 种类型的细分统计（带缩进）
   - 最快速度和平均速度

预期：
- 总挥拍 = 各类型之和
- 树形结构显示正确（├ 和 └）
- 速度统计正确

- [ ] **Step 6: Check console logs**

在浏览器控制台检查：
1. `StrokeClassifier initialized in standard mode`
2. 每次测试挥拍有 `smash/drive/lift/clear detected` 日志
3. `Recorded [type]: total=X, [type]=Y` 日志
4. 无错误信息

预期：日志完整，无报错。

- [ ] **Step 7: Test new workout**

1. 点击"开始新运动"
2. 验证回到 idle 状态
3. 观察是否显示"上次运动"信息

预期：正常返回 idle，上次运动显示完整数据。

- [ ] **Step 8: Document test results**

创建测试日志：
```bash
cd C:/code/01-practice/swing/swing/src
echo "Phase 2 Simulator Test Results - $(date)" > test-results-phase2.txt
echo "====================================" >> test-results-phase2.txt
echo "" >> test-results-phase2.txt
echo "Test Date: $(date)" >> test-results-phase2.txt
echo "Test Environment: Simulator" >> test-results-phase2.txt
echo "" >> test-results-phase2.txt
echo "[ ] Basic UI displays 4 stroke types" >> test-results-phase2.txt
echo "[ ] Test swing generates random types" >> test-results-phase2.txt
echo "[ ] Stroke counts increment correctly" >> test-results-phase2.txt
echo "[ ] Speed statistics accurate" >> test-results-phase2.txt
echo "[ ] Pause/resume works" >> test-results-phase2.txt
echo "[ ] Finish screen shows breakdown" >> test-results-phase2.txt
echo "[ ] Console logs complete" >> test-results-phase2.txt
echo "" >> test-results-phase2.txt
echo "Issues found:" >> test-results-phase2.txt
echo "(List any bugs or issues)" >> test-results-phase2.txt
```

手动填写结果并保存。

- [ ] **Step 9: Commit test results**

```bash
git add test-results-phase2.txt
git commit -m "test(phase2): add simulator integration test results

- Tested 4 stroke type display
- Tested random type generation
- Tested stroke counting accuracy
- Tested finish screen breakdown
- Verified console logs"
```

---

## Task 12: Real Device Testing and Threshold Adjustment

**Files:**
- Modify: `common/constants.js` (if thresholds need adjustment)
- Test: Real badminton practice session

- [ ] **Step 1: Deploy to real device**

将编译好的 RPK 文件安装到 Xiaomi Vela 手表：
```bash
cd C:/code/01-practice/swing/swing
npm run build
# 将生成的 RPK 文件推送到手表
```

- [ ] **Step 2: Conduct real play session**

实际打羽毛球 10-15 分钟，尝试：
1. 几次明显的杀球（向下挥拍）
2. 几次平抽快挡（水平挥拍）
3. 几次网前挑球（轻柔向上）
4. 几次后场高远球（有力向上）

记录每种类型自己做了大约几次。

- [ ] **Step 3: Check results and accuracy**

结束运动后，查看统计：
1. 各类型计数是否合理
2. 是否有明显误判（杀球被识别为抽球等）
3. 是否有某类型完全没有识别到

预估识别准确率（主观评估）。

- [ ] **Step 4: Adjust thresholds if needed**

如果发现问题：

**杀球识别过多**：提高 `smashZ` 绝对值
```javascript
smashZ: -0.7,  // 从 -0.6 改为 -0.7
```

**抽球和其他类型混淆**：调整 `driveZ`
```javascript
driveZ: 0.35,  // 从 0.4 改为 0.35（更严格的水平判断）
```

**高远球和挑球混淆**：调整 `clearMinMag` 或 `clearMaxZ`
```javascript
clearMinMag: 4.0,  // 从 3.5 改为 4.0（需要更大力量）
```

- [ ] **Step 5: Repeat test if thresholds changed**

如果修改了阈值，重新编译并再次测试，直到准确率达到可接受水平（主观评估 > 80%）。

- [ ] **Step 6: Document final thresholds and results**

创建调优报告：
```bash
cd C:/code/01-practice/swing/swing/src
cat > threshold-tuning-report.txt << 'EOF'
Phase 2 Threshold Tuning Report
================================

Test Date: [填写日期]
Device: Xiaomi Vela SmartWatch
Test Duration: 15 minutes
Test Environment: Real badminton play

Initial Thresholds:
- smashZ: -0.6
- driveZ: 0.4
- liftZ: 0.5
- clearMinMag: 3.5g
- clearMaxZ: 0.8

Test Results (Round 1):
- Smash accuracy: [X%]
- Drive accuracy: [X%]
- Lift accuracy: [X%]
- Clear accuracy: [X%]
- Common misclassifications: [描述]

Adjustments Made:
[如果有调整，记录这里]

Final Thresholds:
[最终确定的阈值]

Final Accuracy:
- Overall: [X%]
- Notes: [任何观察到的模式或建议]
EOF
```

手动填写报告。

- [ ] **Step 7: Commit threshold adjustments (if any)**

如果修改了 `constants.js`：
```bash
git add common/constants.js threshold-tuning-report.txt
git commit -m "tune(phase2): adjust stroke classification thresholds based on real device testing

- [描述具体调整，例如: Increase smashZ to -0.7 to reduce false positives]
- Real device test accuracy: [X%]
- See threshold-tuning-report.txt for details"
```

如果没有修改：
```bash
git add threshold-tuning-report.txt
git commit -m "test(phase2): document real device testing results

- Initial thresholds work well, no adjustment needed
- Overall accuracy: [X%]
- See threshold-tuning-report.txt for details"
```

---

## Task 13: Final Code Review and Documentation

**Files:**
- Review: All modified files
- Update: README or project documentation (if exists)

- [ ] **Step 1: Review StrokeClassifier class**

检查 `common/strokeClassifier.js`：
- [ ] 所有方法都有完整注释
- [ ] 分类逻辑清晰，优先级正确
- [ ] 没有硬编码的魔法数字（都使用 constants）
- [ ] Export 语句正确

- [ ] **Step 2: Review constants**

检查 `common/constants.js`：
- [ ] DIRECTION_COEFFICIENTS 所有字段都有注释
- [ ] 阈值数值合理（基于真机测试）
- [ ] Export 语句正确

- [ ] **Step 3: Review SensorManager integration**

检查 `pages/main/index.ux` 中的 SensorManager：
- [ ] Import StrokeClassifier 正确
- [ ] Constructor 初始化 classifier
- [ ] handleSensorData 调用 classifier.classify()
- [ ] Callback 传递正确的参数 (type, speed)
- [ ] updateThreshold 同步更新 classifier

- [ ] **Step 4: Review SessionManager data model**

检查 `pages/main/index.ux` 中的 SessionManager：
- [ ] createSession 初始化所有 4 种类型字段为 0
- [ ] version: 2 字段存在
- [ ] recordSwing 接收并使用 type 参数
- [ ] totalSwings 计算正确（虽然是累加，但逻辑正确）

- [ ] **Step 5: Review StorageManager version check**

检查 `pages/main/index.ux` 中的 StorageManager：
- [ ] loadHistory 检测 version < 2 或无 version
- [ ] 清空逻辑正确执行
- [ ] 日志输出完整

- [ ] **Step 6: Review UI templates**

检查模板部分：
- [ ] Running state 显示 4 种类型
- [ ] Finished state 显示层级结构
- [ ] 数据绑定正确 (session.stats.smash 等)
- [ ] 样式类名正确

- [ ] **Step 7: Review UI styles**

检查样式部分：
- [ ] summary-sub, summary-label-sub, summary-value-sub 样式存在
- [ ] 字体大小和颜色合理
- [ ] 缩进效果明显

- [ ] **Step 8: Check for console.log cleanup**

搜索所有 console.log，确认：
- [ ] 重要的日志保留（初始化、检测、错误）
- [ ] 调试用的详细日志可以保留（有助于后续调试）
- [ ] 没有无意义的日志

- [ ] **Step 9: Update project README**

如果项目有 README.md，添加 Phase 2 说明：
```markdown
## Phase 2: Stroke Classification (v2.0.0)

### Features
- 4 stroke types recognition: Smash, Drive, Lift, Clear
- Direction-based classification using accelerometer data
- Real-time stroke counting during workout
- Detailed stroke breakdown in finish screen

### Algorithm
- **Smash**: Downward strokes (z-ratio < -0.6)
- **Drive**: Horizontal strokes (|z-ratio| < 0.4)
- **Lift**: Gentle upward strokes (z-ratio > 0.5)
- **Clear**: Powerful upward strokes (magnitude >= 3.5g, 0.5 < z-ratio < 0.8)

### Testing
- Simulator: Use "测试挥拍" button to generate random strokes
- Real device: Actual play session for threshold tuning

### Data Model
- Version 2 data model (incompatible with Phase 1)
- Old history automatically cleared on first launch
```

- [ ] **Step 10: Commit documentation updates**

```bash
git add README.md  # 如果有修改
git commit -m "docs(phase2): update README with Phase 2 features

- Add stroke classification feature description
- Document algorithm and thresholds
- Add testing instructions
- Note v2 data model breaking change"
```

---

## Task 14: Tag Phase 2 Release

**Files:**
- Git tag

- [ ] **Step 1: Verify all changes committed**

```bash
cd C:/code/01-practice/swing/swing/src
git status
```

预期：工作目录干净，没有未提交的修改。

- [ ] **Step 2: Review git log**

```bash
git log --oneline -15
```

检查最近的提交是否都是 Phase 2 相关的。

- [ ] **Step 3: Create annotated tag**

```bash
git tag -a v2.0.0-phase2 -m "Phase 2: Stroke Classification

Features:
- 4 stroke types: smash, drive, lift, clear
- StrokeClassifier class for direction analysis
- Real-time stroke counting
- Detailed statistics breakdown

Breaking Changes:
- Data model v2 (clears v1 history)
- SessionManager.recordSwing() signature changed

Testing:
- Simulator: 100% pass
- Real device: [X%] accuracy

Thresholds:
- smashZ: -0.6, driveZ: 0.4, liftZ: 0.5
- clearMinMag: 3.5g, clearMaxZ: 0.8"
```

- [ ] **Step 4: Push tag to remote (if applicable)**

```bash
git push origin v2.0.0-phase2  # 如果有 remote
```

- [ ] **Step 5: Verify tag created**

```bash
git tag -l -n9 v2.0.0-phase2
```

预期：显示完整的 tag 信息。

- [ ] **Step 6: Create release summary**

创建发布说明：
```bash
cat > RELEASE-v2.0.0-phase2.md << 'EOF'
# Release v2.0.0 - Phase 2: Stroke Classification

**Release Date**: 2026-06-15  
**Build**: v2.0.0-phase2

## What's New

### Stroke Type Recognition
- **4 Main Types**: Smash, Drive, Lift, Clear
- **Direction Analysis**: Based on Z-axis acceleration ratio
- **Real-time Counting**: See stroke breakdown during workout

### Enhanced Statistics
- Individual counts for each stroke type
- Tree-style breakdown in finish screen
- Maintained global speed statistics (max, average)

### Technical Improvements
- New `StrokeClassifier` class for modular classification
- Version 2 data model with backward incompatibility handling
- Improved sensor data logging for debugging

## Breaking Changes

⚠️ **Data Model V2**: Phase 1 history will be automatically cleared on first launch.

## Installation

Deploy the generated RPK file to Xiaomi Vela SmartWatch:
```
npm run build
# Install: C:/code/01-practice/swing/.temp_swing/dist/com.application.watch.badminton.debug.2.0.0.rpk
```

## Testing

- **Simulator**: Use "测试挥拍" button (generates random stroke types)
- **Real Device**: Wear watch and play badminton

## Algorithm Parameters

```javascript
smashZ: -0.6      // Downward threshold
driveZ: 0.4       // Horizontal threshold
liftZ: 0.5        // Upward threshold
clearMinMag: 3.5  // Clear minimum magnitude (g)
clearMaxZ: 0.8    // Clear maximum Z-ratio
```

## Known Limitations

- Thresholds may need adjustment based on play style
- Watch wearing position affects accuracy
- 'Other' type not displayed in UI (included in totalSwings)

## Next Phase

Phase 3 will add:
- Chart visualization (pie chart, line chart)
- Historical data detail view
- Auto-pause optimization
- Export functionality

## Credits

Developed using Claude Code  
Design Spec: `docs/superpowers/specs/2026-06-15-badminton-phase2-stroke-classification.md`  
Implementation Plan: `docs/superpowers/plans/2026-06-15-badminton-phase2-stroke-classification.md`
EOF
```

- [ ] **Step 7: Commit release notes**

```bash
git add RELEASE-v2.0.0-phase2.md
git commit -m "release: Phase 2 v2.0.0 release notes

- Document new features and breaking changes
- Add installation and testing instructions
- List algorithm parameters and known limitations"
```

---

## Success Criteria

**Phase 2 is complete when:**

- [x] StrokeClassifier class implemented and tested
- [x] 4 stroke types correctly identified (smash, drive, lift, clear)
- [x] SessionManager records stroke type statistics
- [x] Running UI displays 4 stroke type counts in real-time
- [x] Finished UI shows hierarchical stroke breakdown
- [x] Version check clears v1 history data
- [x] Test swing generates random stroke types with realistic speeds
- [x] Simulator testing passes (100% functional)
- [x] Real device testing achieves acceptable accuracy (>80%)
- [x] All code reviewed and documented
- [x] Phase 2 tagged and released (v2.0.0-phase2)

**Quality Metrics:**
- Code: Clean, well-commented, follows existing patterns
- Performance: No sensor lag, UI updates smoothly
- Accuracy: Real device testing subjectively >80% correct
- Compatibility: Old data correctly handled (cleared)

---

## Appendix: File Modification Summary

**New Files (1):**
- `common/strokeClassifier.js` (~100 lines)

**Modified Files (2):**
- `common/constants.js` (+10 lines)
- `pages/main/index.ux` (~50 lines changed, template + script + style)

**Test/Doc Files (3):**
- `test-results-phase2.txt` (created)
- `threshold-tuning-report.txt` (created)
- `RELEASE-v2.0.0-phase2.md` (created)

**Total LOC Changed:** ~160 lines

**Estimated Implementation Time:** 4-6 hours
- Core implementation: 3 hours
- Simulator testing: 1 hour
- Real device testing: 1-2 hours
- Documentation: 1 hour
