# 📜 Patch Notes - UI & Performance Update

## ⚔️ Combat & Performance
- **Log Optimization**: Fixed performance issues caused by infinite combat logs.
  - Implemented a strict **30-line limit** for textual logs to prevent lag.
  - Added smart filtering: "Spammy" messages are removed, but critical info (Victory, Drops, Level Up) is retained.
- **Detailed Feedback**: Restored **Damage Dealt**, **Damage Taken**, and **Healing** messages to the log, but respecting the new line limit to keep the game smooth.
- **Stat Verification**: Confirmed that **Intelligence (INT)** correctly grants **+1% Gold** and **+1% XP** per point globally.

## 📱 Mobile Experience
- **Unified Combat Layout**: The mobile combat screen now matches the PC design:
  - **Row Layout**: Replaced the vertical card view with a compact row design.
  - **Smart Wrapping**: Elements wrap intelligently (Name/Button on top, Stats/Drops on bottom) to fit small screens without horizontal scrolling.
  - **Full Info**: *XP/Hour*, *Silver/Hour*, and *Survival Time* stats are now visible on mobile!
  - **Compact Mode**: Reduced padding and font sizes for a cleaner, high-density view.

## 🎒 Inventory & UI
- **Filter Layout**: Redesigned the Inventory header for better usability.
  - **Split View**: Separated Category Filters (Top) from Search & Sort controls (Bottom).
  - Improved spacing and touch targets for mobile users.

---
*Enjoy the smoother, cleaner experience!* 🚀
