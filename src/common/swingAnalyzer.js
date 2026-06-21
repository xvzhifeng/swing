/**
 * 传感器数据滤波器 (低通降噪 + 高通去重力)
 */
class SensorFilter {
  constructor(lowPassAlpha = 0.2, highPassBeta = 0.9) {
    this.lowPassAlpha = lowPassAlpha
    this.highPassBeta = highPassBeta
    this.lastLowPass = { x: 0, y: 0, z: 0 }
    this.lastHighPass = { x: 0, y: 0, z: 0 }
    this.isFirstData = true
  }

  process(rawX, rawY, rawZ) {
    if (this.isFirstData) {
      this.lastLowPass = { x: rawX, y: rawY, z: rawZ }
      this.lastHighPass = { x: 0, y: 0, z: 0 }
      this.isFirstData = false
      return this.lastHighPass
    }

    const currentLowPass = { x: 0, y: 0, z: 0 }
    const currentHighPass = { x: 0, y: 0, z: 0 }

    const axes = ['x', 'y', 'z']
    const rawValues = { x: rawX, y: rawY, z: rawZ }

    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i]
      // 1. 低通滤波 (平滑毛刺)
      currentLowPass[axis] = this.lowPassAlpha * rawValues[axis] + (1 - this.lowPassAlpha) * this.lastLowPass[axis]
      // 2. 高通滤波 (消除 9.8 重力)
      currentHighPass[axis] = this.highPassBeta * (this.lastHighPass[axis] + currentLowPass[axis] - this.lastLowPass[axis])
    }

    this.lastLowPass = currentLowPass
    this.lastHighPass = currentHighPass

    return currentHighPass // 返回纯净的动态加速度
  }

  reset() {
    this.lastLowPass = { x: 0, y: 0, z: 0 }
    this.lastHighPass = { x: 0, y: 0, z: 0 }
    this.isFirstData = true
  }
}

/**
 * 羽毛球挥拍实时分析器
 */
export default class BadmintonSwingAnalyzer {
  constructor(onSwingDetected, thresholds) {
    // 使用传入的阈值配置，如果没有则使用默认值
    const config = thresholds || {
      // 动作截取阈值
      TRIGGER_THRESHOLD: 8,   // 触发阈值 (G) - 开始记录挥拍
      QUIET_THRESHOLD: 3,     // 安静阈值 (G) - 判断动作结束
      MIN_QUIET_FRAMES: 10,     // 连续安静帧数 - 确认动作结束
      COOLDOWN_FRAMES: 25,      // 冷却帧数 (约500ms) - 防止余震
  
      // 分类特征阈值（基于手腕运动模式）
      SMASH_MIN_A: 25,              // 杀球：最小加速度 (G)
      SMASH_MIN_KURTOSIS: 3.0,      // 杀球：最小峰度（尖锐爆发）
      SMASH_MIN_DECELERATION: 10,   // 杀球：峰后最小减速 (G)
      SMASH_MIN_WRIST_FLIP: 0.05,   // 杀球：最小手腕翻转速度 (G/ms)
  
      CLEAR_MIN_A: 20,              // 高远球：最小加速度 (G)
      CLEAR_MIN_T_SWING: 200,       // 高远球：最小发力时长 (ms)
      CLEAR_MAX_KURTOSIS: 2.5,      // 高远球：最大峰度（平缓发力）
  
      LIFT_MAX_A: 12,               // 挑球：最大加速度 (G)
      LIFT_MAX_WRIST_FLIP: 0.03,    // 挑球：最大手腕翻转速度
  
      DRIVE_MAX_T_SWING: 180,           // 平抽：最大发力时长 (ms)
      DRIVE_MAX_QUIET_RATIO: 0.25,      // 平抽：最安静轴占比
  
      // 滤波器参数
      LOW_PASS_ALPHA: 0.2,      // 低通滤波系数 (平滑去噪)
      HIGH_PASS_BETA: 0.9       // 高通滤波系数 (去重力)
    }

    this.filter = new SensorFilter(config.LOW_PASS_ALPHA, config.HIGH_PASS_BETA)
    this.onSwingDetected = onSwingDetected // 识别成功后的回调函数

    // 缓存与状态机
    this.buffer = []
    this.maxBufferSize = 100 // 约 2 秒历史数据 (按 20ms 采样率计算)
    this.state = 'IDLE'      // 状态: IDLE, RECORDING, COOLDOWN
    this.swingData = []
    this.quietFrames = 0

    // 动作截取阈值
    this.TRIGGER_THRESHOLD = config.TRIGGER_THRESHOLD
    this.QUIET_THRESHOLD = config.QUIET_THRESHOLD
    this.MIN_QUIET_FRAMES = config.MIN_QUIET_FRAMES
    this.COOLDOWN_FRAMES = config.COOLDOWN_FRAMES
    this.currentCooldown = 0

    // 分类特征阈值（基于手腕运动模式）
    this.SMASH_MIN_A = config.SMASH_MIN_A
    this.SMASH_MIN_KURTOSIS = config.SMASH_MIN_KURTOSIS
    this.SMASH_MIN_DECELERATION = config.SMASH_MIN_DECELERATION
    this.SMASH_MIN_WRIST_FLIP = config.SMASH_MIN_WRIST_FLIP
    this.CLEAR_MIN_A = config.CLEAR_MIN_A
    this.CLEAR_MIN_T_SWING = config.CLEAR_MIN_T_SWING
    this.CLEAR_MAX_KURTOSIS = config.CLEAR_MAX_KURTOSIS
    this.LIFT_MAX_A = config.LIFT_MAX_A
    this.LIFT_MAX_WRIST_FLIP = config.LIFT_MAX_WRIST_FLIP
    this.DRIVE_MAX_T_SWING = config.DRIVE_MAX_T_SWING
    this.DRIVE_MAX_QUIET_RATIO = config.DRIVE_MAX_QUIET_RATIO
  }

  /**
   * 将传感器 API 每 20ms 返回的数据实时喂给这个方法
   */
  feedData(rawX, rawY, rawZ, timestamp) {
    if (!timestamp) {
      timestamp = Date.now()
    }

    // 1. 数据预处理：去噪、去重力
    const filtered = this.filter.process(rawX, rawY, rawZ)
    const aMag = Math.sqrt(filtered.x * filtered.x + filtered.y * filtered.y + filtered.z * filtered.z)

    const dataPoint = { t: timestamp, x: filtered.x, y: filtered.y, z: filtered.z, aMag: aMag }

    // 2. 维护滑动窗口
    this.buffer.push(dataPoint)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    // 3. 状态机流处理
    if (this.state === 'IDLE') {
      if (aMag > this.TRIGGER_THRESHOLD) {
        this.state = 'RECORDING'
        this.quietFrames = 0
        // 截取爆发前约 300ms (15帧) 的引拍数据
        const startIndex = Math.max(0, this.buffer.length - 15)
        this.swingData = []
        for (let i = startIndex; i < this.buffer.length; i++) {
          this.swingData.push(this.buffer[i])
        }
      }
    } else if (this.state === 'RECORDING') {
      this.swingData.push(dataPoint)

      if (aMag < this.QUIET_THRESHOLD) {
        this.quietFrames++
      } else {
        this.quietFrames = 0
      }

      // 结束条件：安静足够久，或者数据包过大(超时兜底)
      if (this.quietFrames >= this.MIN_QUIET_FRAMES || this.swingData.length > 80) {
        this.state = 'COOLDOWN'
        this.currentCooldown = this.COOLDOWN_FRAMES

        // 进入核心计算逻辑
        this._processSwingAction(this.swingData)
      }
    } else if (this.state === 'COOLDOWN') {
      this.currentCooldown--
      if (this.currentCooldown <= 0) {
        this.state = 'IDLE'
        this.swingData = []
      }
    }
  }

  /**
   * 核心算法：提取特征并分类
   * @private
   */
  _processSwingAction(windowData) {
    if (windowData.length < 10) return // 无效短数据

    // 1. 寻找峰值合加速度 (Max_A) 及其索引
    let maxA = 0
    let peakIndex = 0
    for (let i = 0; i < windowData.length; i++) {
      if (windowData[i].aMag > maxA) {
        maxA = windowData[i].aMag
        peakIndex = i
      }
    }

    // 2. 计算挥拍发力时长 (T_swing)
    const threshold = maxA * 0.2 // 以峰值的 20% 作为发力区间边界
    let startIndex = peakIndex
    let endIndex = peakIndex
    while (startIndex > 0 && windowData[startIndex].aMag > threshold) startIndex--
    while (endIndex < windowData.length - 1 && windowData[endIndex].aMag > threshold) endIndex++

    // 时长 (毫秒)
    const tSwing = windowData[endIndex].t - windowData[startIndex].t

    // 3. 特征提取：基于手腕运动模式（与地球坐标系无关）
    let maxX = -Infinity
    let minX = Infinity
    let maxY = -Infinity
    let minY = Infinity
    let maxZ = -Infinity
    let minZ = Infinity

    // 计算峰度（衡量加速度尖锐程度）
    let sumSquaredDiff = 0
    let sumFourthPowerDiff = 0

    // 峰后最大反向加速度（制动特征）
    let maxDecelerationAfterPeak = 0

    const frameCount = endIndex - startIndex + 1

    for (let i = startIndex; i <= endIndex; i++) {
      // 追踪三轴的最大最小值
      if (windowData[i].x > maxX) maxX = windowData[i].x
      if (windowData[i].x < minX) minX = windowData[i].x
      if (windowData[i].y > maxY) maxY = windowData[i].y
      if (windowData[i].y < minY) minY = windowData[i].y
      if (windowData[i].z > maxZ) maxZ = windowData[i].z
      if (windowData[i].z < minZ) minZ = windowData[i].z

      // 计算峰度的累加项
      const mag = windowData[i].magnitude
      const diff = mag - maxA
      sumSquaredDiff += diff * diff
      sumFourthPowerDiff += diff * diff * diff * diff

      // 峰后制动检测：找峰值后的最大负加速度
      if (i > peakIndex) {
        const deceleration = windowData[peakIndex].magnitude - windowData[i].magnitude
        if (deceleration > maxDecelerationAfterPeak) {
          maxDecelerationAfterPeak = deceleration
        }
      }
    }

    // 计算三轴振幅
    const xAmp = maxX - minX
    const yAmp = maxY - minY
    const zAmp = maxZ - minZ

    const maxAmp = Math.max(xAmp, yAmp, zAmp)
    const minAmp = Math.min(xAmp, yAmp, zAmp)

    // 安静轴占比（平面运动特征）
    const quietAxisRatio = maxAmp > 0 ? minAmp / maxAmp : 1

    // 峰度计算（越大=越尖锐）
    const variance = sumSquaredDiff / frameCount
    const kurtosis = variance > 0 ? (sumFourthPowerDiff / frameCount) / (variance * variance) : 0

    // 手腕翻转速度（X轴振幅/时间）
    const wristFlipSpeed = xAmp / tSwing

    // 5. 基于手腕运动模式的分类（不依赖绝对方向）
    let swingType = 'other'
    let speedEstimate = Math.min(Math.round(maxA * 5.5), 350)

    // 杀球：爆发力强 + 尖锐峰值 + 快速手腕鞭打 + 击球后强制动
    if (maxA > this.SMASH_MIN_A &&
        kurtosis > this.SMASH_MIN_KURTOSIS &&
        wristFlipSpeed > this.SMASH_MIN_WRIST_FLIP &&
        maxDecelerationAfterPeak > this.SMASH_MIN_DECELERATION) {
      swingType = 'smash'
      speedEstimate = Math.round(speedEstimate * 1.1)
    }
    // 高远球：力量持续 + 发力时间长 + 平缓加速（低峰度）
    else if (maxA > this.CLEAR_MIN_A &&
             tSwing > this.CLEAR_MIN_T_SWING &&
             kurtosis < this.CLEAR_MAX_KURTOSIS) {
      swingType = 'clear'
    }
    // 挑球：力量小 + 手腕翻转幅度小
    else if (maxA < this.LIFT_MAX_A && wristFlipSpeed < this.LIFT_MAX_WRIST_FLIP) {
      swingType = 'lift'
      speedEstimate = Math.round(speedEstimate * 0.6)
    }
    // 平抽：快速爆发 + 平面运动特征
    else if (tSwing < this.DRIVE_MAX_T_SWING && quietAxisRatio < this.DRIVE_MAX_QUIET_RATIO) {
      swingType = 'drive'
      speedEstimate = Math.round(speedEstimate * 0.8)
    }
    // 兜底：其他类型
    else {
      swingType = 'other'
    }

    // 组装最终报告
    const report = {
      type: swingType,
      speed: speedEstimate,
      features: {
        maxA: maxA.toFixed(2),
        tSwing: tSwing,
        kurtosis: kurtosis.toFixed(2),
        wristFlipSpeed: wristFlipSpeed.toFixed(4),
        maxDeceleration: maxDecelerationAfterPeak.toFixed(2),
        quietAxisRatio: quietAxisRatio.toFixed(3),
        xAmp: xAmp.toFixed(2),
        yAmp: yAmp.toFixed(2),
        zAmp: zAmp.toFixed(2)
      }
    }

    console.log('[SwingAnalyzer] 检测到挥拍:', swingType, ', 速度:', speedEstimate, 'km/h')
    console.log('[特征] maxA=' + maxA.toFixed(2) + 'g, tSwing=' + tSwing + 'ms, 峰度=' + kurtosis.toFixed(2))
    console.log('[手腕] 翻转速度=' + wristFlipSpeed.toFixed(4) + 'g/ms, 峰后减速=' + maxDecelerationAfterPeak.toFixed(2) + 'g')
    console.log('[振幅] X=' + xAmp.toFixed(2) + ', Y=' + yAmp.toFixed(2) + ', Z=' + zAmp.toFixed(2) + ', 安静轴=' + quietAxisRatio.toFixed(3))

    if (this.onSwingDetected) {
      this.onSwingDetected(report)
    }
  }

  /**
   * 重置分析器状态
   */
  reset() {
    this.filter.reset()
    this.buffer = []
    this.state = 'IDLE'
    this.swingData = []
    this.quietFrames = 0
    this.currentCooldown = 0
  }
}
