/**
 * 传感器数据滤波器
 * 使用低通+高通滤波组合，去除噪音和重力分量
 */
class SensorFilter {
  constructor(lowPassAlpha = 0.2, highPassBeta = 0.9) {
    this.lowPassAlpha = lowPassAlpha
    this.highPassBeta = highPassBeta

    // 保存上一次的数据状态
    this.lastRaw = { x: 0, y: 0, z: 0 }
    this.lastLowPass = { x: 0, y: 0, z: 0 }
    this.lastHighPass = { x: 0, y: 0, z: 0 }

    this.isFirstData = true
  }

  process(rawX, rawY, rawZ) {
    if (this.isFirstData) {
      // 第一次收到数据，初始化状态
      this.lastRaw = { x: rawX, y: rawY, z: rawZ }
      this.lastLowPass = { x: rawX, y: rawY, z: rawZ }
      this.lastHighPass = { x: 0, y: 0, z: 0 } // 初始认为动态加速度为0
      this.isFirstData = false
      return this.lastHighPass
    }

    const currentLowPass = { x: 0, y: 0, z: 0 }
    const currentHighPass = { x: 0, y: 0, z: 0 }

    // 针对 X, Y, Z 三个轴分别进行过滤计算
    const axes = ['x', 'y', 'z']
    const rawValues = [rawX, rawY, rawZ]

    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i]
      const raw = rawValues[i]

      // 1. 低通滤波 (平滑去噪)
      currentLowPass[axis] = this.lowPassAlpha * raw + (1 - this.lowPassAlpha) * this.lastLowPass[axis]

      // 2. 高通滤波 (消除重力)
      currentHighPass[axis] = this.highPassBeta * (this.lastHighPass[axis] + currentLowPass[axis] - this.lastLowPass[axis])
    }

    // 更新上一次的状态，供下一帧使用
    this.lastRaw = { x: rawX, y: rawY, z: rawZ }
    this.lastLowPass = currentLowPass
    this.lastHighPass = currentHighPass

    // 返回经过"平滑"且"去重力"后的纯动态加速度
    return currentHighPass
  }

  /**
   * 重置滤波器状态
   */
  reset() {
    this.lastRaw = { x: 0, y: 0, z: 0 }
    this.lastLowPass = { x: 0, y: 0, z: 0 }
    this.lastHighPass = { x: 0, y: 0, z: 0 }
    this.isFirstData = true
  }
}

export default SensorFilter
