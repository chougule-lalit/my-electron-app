# 🚀 Setup Instructions - Simple Invoice Generator

## For Non-Technical Users

This guide will help you set up and run the Invoice Generator on your computer from scratch.

---

## 📋 What You Need

Before starting, you need to install:
1. **Node.js** - Software that runs the application
2. **Git** (optional) - To download the code

---

## Step 1: Install Node.js

### Download and Install:
1. Go to: **https://nodejs.org/**
2. Click the **green button** that says "Download Node.js (LTS)"
3. Run the downloaded file
4. Click **Next → Next → Next → Install**
5. Wait for installation to complete
6. Click **Finish**

### Verify Installation:
1. Press **Windows Key + R**
2. Type: `cmd` and press Enter
3. Type: `node --version` and press Enter
4. You should see something like: `v20.x.x`
5. Close the window

✅ **Node.js is now installed!**

---

## Step 2: Get the Application Code

### Option A: Download ZIP (Easier)
1. Go to the project page on GitHub
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to a folder (e.g., `C:\Projects\invoice-app`)

### Option B: Using Git (If you have it)
1. Open **PowerShell** or **Command Prompt**
2. Navigate to where you want the project
3. Run:
   ```
   git clone [your-repository-url]
   ```

---

## Step 3: Install Application Dependencies

1. **Open PowerShell:**
   - Press **Windows Key**
   - Type: `PowerShell`
   - Click **Windows PowerShell**

2. **Navigate to the project folder:**
   ```powershell
   cd D:\Lalit\Personal\my-electron-app
   ```
   *(Replace with your actual folder path)*

3. **Install dependencies:**
   ```powershell
   npm install
   ```
   
4. **Wait 2-5 minutes** while it downloads everything needed

✅ **Dependencies installed!**

---

## Step 4: Run the Application

### Start the App:
In the same PowerShell window, type:
```powershell
npm start
```

**That's it!** The application window will open automatically.

---

## 🎯 Quick Reference

### To run the app every time:
1. Open PowerShell
2. Navigate to project folder:
   ```powershell
   cd D:\Lalit\Personal\my-electron-app
   ```
3. Start the app:
   ```powershell
   npm start
   ```

### To build EXE file:
```powershell
npm run build
```
Find your EXE in the `dist` folder after 5-10 minutes.

---

## ❓ Common Issues

### "npm is not recognized"
**Problem:** Node.js not installed properly  
**Solution:** Restart your computer after installing Node.js

### "Cannot find module"
**Problem:** Dependencies not installed  
**Solution:** Run `npm install` again

### App doesn't start
**Problem:** Wrong folder or installation incomplete  
**Solution:** 
1. Make sure you're in the correct folder
2. Run `npm install` again
3. Try `npm start` again

---

## 📁 Folder Structure

After setup, you should see:
```
my-electron-app/
├── node_modules/     (installed dependencies - don't touch)
├── dist/            (built EXE files will be here)
├── main.js          (application code)
├── index.html       (application interface)
├── package.json     (project configuration)
└── README files     (documentation)
```

---

## ✅ You're All Set!

Your development environment is ready. You can now:
- ✅ Run the app with `npm start`
- ✅ Make changes to the code
- ✅ Build EXE files with `npm run build`

---

## 🆘 Need More Help?

- **For building EXE:** See `QUICK_BUILD.md`
- **For detailed build info:** See `BUILD_GUIDE.md`
- **For app features:** See `PRD.md`

**Stuck?** Check the "Common Issues" section above or search online for the error message.

---

**Time Required:**
- Node.js installation: 5 minutes
- Download project: 2 minutes
- Install dependencies: 3-5 minutes
- **Total: ~10-15 minutes**

Good luck! 🎉
