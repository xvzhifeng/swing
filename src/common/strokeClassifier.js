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

class StrokeClassifier {
  /**
   * @param {string} mode - 'standard' or 'professional'
   */
  constructor(mode = 'standard') {
    this.mode = mode
    this.threshold = THRESHOLDS[mode].swingThreshold
    console.log(`StrokeClassifier initialized in ${mode} mode, threshold=${this.threshold}g`)
  }

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

export default StrokeClassifier
