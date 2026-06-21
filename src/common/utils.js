// common/utils.js
// Utility functions for badminton tracking app

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) {
    return '00:00'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(secs)}`
  }
  return `${padZero(minutes)}:${padZero(secs)}`
}

/**
 * Pad number with leading zero
 * @param {number} num - Number to pad
 * @returns {string} Padded string
 */
export function padZero(num) {
  return num.toString().padStart(2, '0')
}

/**
 * Format timestamp to date string (M月D日 HH:MM)
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (typeof timestamp !== 'number' || timestamp < 0 || !Number.isFinite(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = padZero(date.getHours())
  const minutes = padZero(date.getMinutes())

  return `${month}月${day}日 ${hours}:${minutes}`
}

/**
 * Calculate speed from acceleration magnitude
 * @param {number} magnitude - Acceleration magnitude in g
 * @param {number} coefficient - Speed coefficient (default: 25)
 * @returns {number} Speed in km/h (rounded to integer)
 */
export function calculateSpeed(magnitude, coefficient = 25) {
  if (typeof magnitude !== 'number' || magnitude < 0) {
    return 0
  }
  return Math.round(magnitude * coefficient)
}

/**
 * Calculate acceleration magnitude from x, y, z components
 * @param {number} x - X-axis acceleration (g)
 * @param {number} y - Y-axis acceleration (g)
 * @param {number} z - Z-axis acceleration (g)
 * @returns {number} Magnitude (g)
 */
export function calculateMagnitude(x, y, z) {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return 0
  }
  return Math.sqrt(x * x + y * y + z * z)
}
