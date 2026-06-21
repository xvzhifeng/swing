# Release Notes

## v2.0.0-beta (2026-06-15) - Phase 2 Beta

### 🎯 Major Features

#### Stroke Type Classification
- **Four stroke types**: Smash (杀球), Drive (抽球), Lift (挑球), Clear (高远球)
- **Direction-based analysis**: Uses accelerometer x/y/z data to classify stroke types
- **Real-time display**: Shows stroke counts during workout
- **Detailed breakdown**: Finish screen displays complete stroke statistics

#### Custom Calibration Mode
- **Three difficulty modes**:
  - Standard: 2.0g threshold (beginners)
  - Professional: 2.5g threshold (advanced players)
  - Custom: User-calibrated threshold
- **5-swing calibration**: Perform 5 normal swings to set personalized threshold
- **Persistent storage**: Custom threshold saved and loaded automatically
- **Visual feedback**: Real-time progress display during calibration

### 🛠️ Technical Improvements
- New `StrokeClassifier` class for stroke type analysis
- Direction coefficients configuration (DIRECTION_COEFFICIENTS)
- Enhanced SessionManager with stroke type statistics
- Version check system in StorageManager
- Improved UI layouts for stroke type display

### ⚠️ Beta Status
This is a **BETA RELEASE**. The following tasks are pending:
- [ ] Simulator integration testing (Task #40)
- [ ] Real device testing and threshold adjustment (Task #41)
- [ ] Final code review and documentation (Task #42)

**Known Limitations:**
- Stroke classification thresholds based on theoretical analysis, not validated on real device
- Custom calibration feature tested in development only
- Performance on actual Xiaomi Vela SmartWatch not verified

### 📦 Included Commits
- Phase 2 core features (6 commits)
- Custom calibration mode (11 commits including fixes)
- UI improvements and bug fixes

### 🔄 Upgrade from v1.0.0-phase1
- **Breaking changes**: None - fully backward compatible
- **Data migration**: Automatic version check and migration
- **Storage keys**: New key added for custom threshold (`customThreshold`)

### 🚀 Next Steps
1. Deploy to real Xiaomi Vela device
2. Conduct actual badminton play session
3. Validate stroke classification accuracy
4. Adjust thresholds if needed
5. Release v2.0.0 stable

---

## v1.0.0-phase1 (2026-06-15) - Initial Release

### Features
- Basic swing detection using accelerometer
- Start/Pause/Resume workout
- Real-time swing count and speed tracking
- Session persistence and crash recovery
- Workout history with detail view
- Two difficulty modes (Standard/Professional)

### Initial Implementation
- SensorManager for accelerometer handling
- SessionManager for workout state
- StorageManager for data persistence
- Complete UI with idle/running/paused/finished states
