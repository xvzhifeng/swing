// common/constants.js
// Configuration constants for badminton tracking app

// Sensor thresholds for swing detection (Phase 1: basic swing only)
export const THRESHOLDS = {
  standard: {
    swingThreshold: 2.0  // Minimum acceleration for valid swing (g)
  },
  professional: {
    swingThreshold: 2.5  // Professional mode: 25% higher threshold
  },
  custom: {
    swingThreshold: 2.0  // Custom mode: will be overridden by calibration
  }
}

// Calibration constants
export const CALIBRATION_SWINGS = 5  // Number of swings needed for calibration
export const CALIBRATION_MIN_THRESHOLD = 1.5  // Minimum threshold to detect calibration swing (g)
export const CALIBRATION_MULTIPLIER = 0.8  // Custom threshold = average * 0.8 (80%)

// Timing constants
export const DEBOUNCE_TIME = 200  // ms - Prevent duplicate swing detection
export const UI_UPDATE_INTERVAL = 100  // ms - Throttle UI updates
export const AUTO_PAUSE_TIMEOUT = 120000  // ms - 2 minutes inactivity
export const AUTO_PAUSE_CHECK_INTERVAL = 30000  // ms - Check every 30 seconds

// Storage constants
export const STORAGE_KEY = 'badminton_sessions'
export const STORAGE_KEY_TEMP = 'current_session_temp'
export const STORAGE_KEY_CUSTOM_THRESHOLD = 'badminton_custom_threshold'  // Custom calibration threshold
export const MAX_HISTORY = 30  // Maximum number of sessions to keep

// Speed calculation
export const SPEED_COEFFICIENT = 25  // Speed (km/h) = acceleration (g) × coefficient

// UI colors (for future use in Phase 2/3)
export const COLORS = {
  smash: '#f44336',
  drive: '#ff9800',
  lift: '#2196f3',
  other: '#9e9e9e',
  primary: '#09ba07'
}

// Direction analysis coefficients for stroke classification (Phase 2)
export const DIRECTION_COEFFICIENTS = {
  smashZ: -0.6,      // Smash: z/magnitude < -0.6 (downward)
  driveZ: 0.4,       // Drive: |z/magnitude| < 0.4 (horizontal)
  liftZ: 0.5,        // Lift: z/magnitude > 0.5 (upward)
  clearMinMag: 3.5,  // Clear: minimum magnitude (g) for powerful upward stroke
  clearMaxZ: 0.8     // Clear: maximum z ratio (not too steep)
}

// Swing Analyzer Thresholds (滑动窗口+状态机 挥拍分析器)
export const ANALYZER_THRESHOLDS = {
  standard: {
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
  },

  professional: {
    // 专业模式：阈值提高约20%
    TRIGGER_THRESHOLD: 11,
    QUIET_THRESHOLD: 4,
    MIN_QUIET_FRAMES: 10,
    COOLDOWN_FRAMES: 25,

    SMASH_MIN_A: 28,
    SMASH_MIN_KURTOSIS: 4.0,      // 专业模式：更尖锐的爆发
    SMASH_MIN_DECELERATION: 15,
    SMASH_MIN_WRIST_FLIP: 0.06,

    CLEAR_MIN_A: 23,
    CLEAR_MIN_T_SWING: 200,
    CLEAR_MAX_KURTOSIS: 2.0,

    LIFT_MAX_A: 12,
    LIFT_MAX_WRIST_FLIP: 0.03,

    DRIVE_MAX_T_SWING: 180,
    DRIVE_MAX_QUIET_RATIO: 0.25,

    LOW_PASS_ALPHA: 0.2,
    HIGH_PASS_BETA: 0.9
  },

  custom: {
    // 自定义模式：默认值
    TRIGGER_THRESHOLD: 3.0,
    QUIET_THRESHOLD: 1.5,
    MIN_QUIET_FRAMES: 10,
    COOLDOWN_FRAMES: 25,

    SMASH_MIN_A: 15,
    SMASH_MIN_KURTOSIS: 2.5,
    SMASH_MIN_DECELERATION: 8,
    SMASH_MIN_WRIST_FLIP: 0.04,

    CLEAR_MIN_A: 10,
    CLEAR_MIN_T_SWING: 200,
    CLEAR_MAX_KURTOSIS: 3.0,

    LIFT_MAX_A: 12,
    LIFT_MAX_WRIST_FLIP: 0.04,

    DRIVE_MAX_T_SWING: 180,
    DRIVE_MAX_QUIET_RATIO: 0.25,

    LOW_PASS_ALPHA: 0.2,
    HIGH_PASS_BETA: 0.9
  }
}
