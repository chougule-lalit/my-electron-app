# Simple Invoice Generator

A modern, offline-first desktop application for creating and managing professional invoices.

## Features

✨ **Easy Invoice Creation**
- Auto-generated invoice numbers
- Real-time calculations
- Smart item suggestions
- Customer management

🎨 **Professional Output**
- A5-sized invoices
- PDF export
- Print support
- Custom business branding

💾 **Offline First**
- All data stored locally
- No internet required
- SQLite database
- Complete privacy

🖼️ **Customizable**
- Add your business logo
- Configure business details
- GSTIN support
- Owner information

## Installation

### Option 1: Using Installer (Recommended)
1. Download `Simple Invoice Generator Setup.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop

### Option 2: Portable Version
1. Download `Simple Invoice Generator.exe`
2. Place in any folder
3. Double-click to run
4. No installation needed

## System Requirements

- **OS:** Windows 10 or later (64-bit)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Storage:** 500 MB free space
- **Display:** 1280x720 minimum resolution

## First Time Setup

1. **Configure Business Settings**
   - Click "Settings" in the sidebar
   - Enter your business name and address
   - Add GSTIN (if applicable)
   - Upload your business logo
   - Click "Save Settings"

2. **Create Your First Invoice**
   - Click "New Invoice" in the sidebar
   - Enter customer name
   - Add items with quantities and rates
   - Review the automatic calculations
   - Click "Save Invoice"

3. **Print or Export**
   - Click "Preview" to see print preview
   - Click "Save as PDF" to export
   - Click "Direct Print" to print

## Data Storage

Your data is stored locally at:
```
C:\Users\[YourUsername]\AppData\Roaming\simple-invoice-generator\
```

### Backup Your Data
To backup your invoices and settings:
1. Navigate to the data folder above
2. Copy `invoice_generator.db` file
3. Store safely (USB drive, cloud storage, etc.)

### Restore Data
To restore from backup:
1. Close the application
2. Replace `invoice_generator.db` with your backup
3. Restart the application

## Troubleshooting

### Application won't start
- Ensure Windows 10 or later
- Run as Administrator
- Check antivirus hasn't blocked it

### PDF generation fails
- Check disk space (at least 100 MB free)
- Verify Downloads folder is accessible
- Try restarting the application

### Logo not displaying
- Use PNG, JPG, or GIF format
- Keep file size under 5 MB
- Use square images (recommended)

### Database errors
- Close and restart application
- Check file permissions in AppData folder
- If persistent, delete database and start fresh

## Support

For issues or questions:
- Check BUILD_GUIDE.md for technical details
- Review PRD.md for feature documentation
- Contact: [Your Email or Support Contact]

## Version

**Current Version:** 1.0.0  
**Release Date:** October 25, 2025  
**Platform:** Windows (64-bit)

## License

This software is provided as-is without warranty. Use at your own risk.

---

Made with ❤️ for small businesses and freelancers
