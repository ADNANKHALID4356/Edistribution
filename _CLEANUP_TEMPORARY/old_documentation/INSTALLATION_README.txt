════════════════════════════════════════════════════════════════════════
  DISTRIBUTION MANAGEMENT SYSTEM - INSTALLATION PACKAGE
  Version: 1.0.0
  Build Date: January 14, 2026
  Ummah Tech Innovations
════════════════════════════════════════════════════════════════════════

📦 PACKAGE CONTENTS:
--------------------
1. INSTALL.bat - Installation script (Run as Administrator)
2. desktop/dist-client/win-unpacked/ - Application files
3. This README file


🚀 INSTALLATION INSTRUCTIONS:
------------------------------
1. Right-click on "INSTALL.bat"
2. Select "Run as Administrator"
3. Follow the on-screen prompts
4. Application will be installed to:
   C:\Program Files\Distribution Management System


✨ WHAT GETS INSTALLED:
-----------------------
✓ Application files in Program Files
✓ Desktop shortcut
✓ Start Menu shortcut
✓ Uninstaller (in installation folder)


🖥️ SYSTEM REQUIREMENTS:
------------------------
- Windows 10 or later (64-bit)
- 4GB RAM minimum
- 500MB free disk space
- Internet connection (to connect to VPS backend)


🌐 BACKEND CONNECTION:
----------------------
This application connects to:
VPS Server: http://147.93.108.205:5001/api

The VPS backend must be running for the app to function.


📋 FEATURES:
------------
✓ Dashboard with real-time statistics
✓ Product management with stock tracking
✓ Shop management
✓ Order processing
✓ Invoice generation with auto-numbering
✓ Delivery tracking
✓ Route management
✓ Salesman management
✓ Reports and analytics


🗑️ UNINSTALLATION:
-------------------
To uninstall the application:
1. Go to: C:\Program Files\Distribution Management System
2. Run "Uninstall.bat" as Administrator


⚙️ TROUBLESHOOTING:
-------------------
Issue: Installation fails
Solution: Make sure you run INSTALL.bat as Administrator

Issue: App won't start
Solution: Check if VPS backend is running at 147.93.108.205:5001

Issue: "Cannot connect to server" error
Solution: 
  - Verify internet connection
  - Check VPS is accessible: ping 147.93.108.205
  - Verify backend service: ssh root@147.93.108.205 "pm2 status"


📞 SUPPORT:
-----------
For technical support or issues:
- Check VPS backend: ssh root@147.93.108.205
- View backend logs: pm2 logs distribution-api
- Verify MySQL database: mysql -u root -p distribution_db


🔐 SECURITY NOTES:
------------------
- All data is stored on the central VPS server
- Communications use HTTP (ensure VPS firewall allows port 5001)
- Login credentials are required for access


📄 LICENSE:
-----------
© 2026 Ummah Tech Innovations. All Rights Reserved.


═══════════════════════════════════════════════════════════════════════
For more information, visit: [Your Website]
Email: [Your Support Email]
═══════════════════════════════════════════════════════════════════════
