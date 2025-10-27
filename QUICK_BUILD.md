# 🎯 Quick Start: Building Your EXE

## Fastest Way to Build

### Method 1: Using PowerShell Script (Easiest)
```powershell
.\build-app.ps1
```
Then choose option 1 for full build.

### Method 2: Direct Command
```powershell
npm run build
```

---

## What You Get

After ~5-10 minutes, you'll have in the `dist/` folder:

1. **`Simple Invoice Generator Setup 1.0.0.exe`** (Installer)
   - Professional installation wizard
   - ~200-300 MB
   - Creates shortcuts and uninstaller

2. **`Simple Invoice Generator 1.0.0.exe`** (Portable)
   - No installation needed
   - ~200-300 MB
   - Run from anywhere

---

## Before First Build (Optional)

### Add an Icon (Recommended)
1. Create or download a 512x512 PNG image
2. Convert to .ico at: https://www.icoconverter.com/
3. Save as `build/icon.ico`

*If you skip this, Windows will use a default icon*

---

## After Building

### Test Your App
1. Go to `dist/` folder
2. Run `Simple Invoice Generator 1.0.0.exe` (portable version)
3. Test all features
4. If everything works, you're ready to distribute!

### Share With Users
- **Simple:** Upload portable .exe to Google Drive, share link
- **Professional:** Share installer .exe for proper installation

---

## File Sizes

**Why so large?** (~250 MB)
- Includes Chromium browser (for PDF generation)
- Includes Electron runtime
- Includes SQLite database engine
- This is normal for Electron apps with PDF generation

---

## Need Help?

📖 **Detailed Guide:** Open `BUILD_GUIDE.md`  
🐛 **Troubleshooting:** Check "Common Issues" section in BUILD_GUIDE.md  
💬 **Quick Fix:** Delete `dist` folder and run build again

---

## Commands Cheat Sheet

```powershell
# Full build (recommended)
npm run build

# Quick test build
npm run build:dir

# Rebuild from scratch
Remove-Item -Recurse -Force dist
npm run build

# Run in development mode
npm start
```

---

That's it! Your app will be ready to share after the build completes. 🚀
