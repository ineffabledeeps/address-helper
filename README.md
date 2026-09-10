# Address Helper Extension

A Chrome extension for the InnoFulfill booking system that helps autofill and manage booking profiles.

## Setup Instructions

### 1. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `address-helper` folder
5. The extension is now installed!

### 2. Using the Extension

- **Popup UI**: Click the extension icon to open the popup
  - View saved profiles
  - Autofill form with saved data
  
- **Sidebar Search**: Type in sender/receiver name or mobile on the booking form
  - Matching profiles appear in a right sidebar
  - Click a profile to autofill the form

- **Auto-Save**: When you click "CONFIRM BOOKING", form data is automatically saved

## Updating the Extension

Simply run the update script:

**Double-click `update.bat`** (from the extension folder)

OR from command line:
```powershell
cd d:\Projects\address-helper
.\update.bat
```

The script will:
1. Pull latest code from GitHub
2. Show instructions to reload the extension
3. Tell you to go to `chrome://extensions/` and click Reload

## Features

- ✅ Save booking profiles with sender/receiver details
- ✅ Quick search and autofill matching profiles
- ✅ Freight validation (minimum 120)
- ✅ Custom dialog for low freight confirmation
- ✅ Automatic KYC number replacement
- ✅ Form validation before booking

## Configuration

Edit `config.js` to customize:
- Form field selectors
- Database name and version
- Target domain

## File Structure

```
address-helper/
├── manifest.json          # Extension configuration
├── config.js             # Shared constants & field definitions
├── content.js            # Form interaction & autofill logic
├── popup.html            # Popup UI
├── popup.js              # Popup functionality
├── update.bat            # Update script
└── README.md             # This file
```

## Troubleshooting

**Extension not loading?**
- Ensure you're on `booking.innofulfill.com` or `innofulfill.com`
- Check DevTools Console (F12) for errors

**Form fields not being detected?**
- Run `window.addressHelperDiagnostics()` in console to see all fields
- Update selectors in `config.js` if needed

**Profiles not saving?**
- Check console for "Missing phone numbers" error
- Both sender and receiver mobile are required

**Update not working?**
- Ensure Git is installed: `git --version`
- Check your internet connection
- Make sure you're in the correct folder

## Version

Current: 1.0

## Support

For issues or feature requests, check the GitHub repository or contact the developer.
