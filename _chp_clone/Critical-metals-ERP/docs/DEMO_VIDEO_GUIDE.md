# Demo Video Recording Guide

## 🎬 How to Record Your Demo Video

Since I cannot create actual video files, here's how you can record a professional demo:

---

## Option 1: Quick Screen Recording (Recommended)

### Tools

| Platform | Tool | Cost |
|----------|------|------|
| **macOS** | QuickTime Player | Free |
| **Windows** | Xbox Game Bar (Win+G) | Free |
| **Linux** | OBS Studio | Free |
| **Cross-platform** | Loom | Free tier |

### Steps (macOS QuickTime)

1. **Open QuickTime Player**
   - Applications → QuickTime Player
   - Or Cmd+Space, type "QuickTime"

2. **Start Recording**
   - File → New Screen Recording
   - Or Cmd+Ctrl+N

3. **Configure Recording**
   - Click arrow next to record button
   - Select microphone (for narration)
   - Show mouse clicks: ✓

4. **Record**
   - Click record button
   - Select full screen or portion
   - Navigate through the demo flow below
   - Click menu bar stop button when done

5. **Export**
   - File → Export As → 1080p
   - Save as `battery-erp-demo.mp4`

---

## Option 2: Professional Recording (OBS Studio)

### Setup

1. **Download OBS**: https://obsproject.com/

2. **Configure Scene**
   - Add "Display Capture" source
   - Add "Audio Input Capture" for microphone
   - Set canvas: 1920x1080, 30fps

3. **Recording Settings**
   - Output → Recording
   - Format: MP4
   - Quality: High

4. **Record**
   - Click "Start Recording"
   - Present your demo
   - Click "Stop Recording"

---

## 📝 Demo Script (3 Minutes)

### Scene 1: Repository Intro (0:00-0:20)

**Show**: GitHub repository page

**Say**:
> "Welcome to Battery ERP - an open-source enterprise resource planning system for battery recycling operations. This production-ready platform integrates with ERPNext, Carbon, Xero, and Precoro."

**Actions**:
- Show repository URL
- Scroll through README
- Show star count and contributors

---

### Scene 2: Login & Authentication (0:20-0:50)

**Show**: Shop Floor UI login page

**Say**:
> "Let me show you the key features. Starting with our secure authentication system with role-based access control supporting four user roles."

**Actions**:
- Navigate to http://localhost:3002
- Show login form
- Login as: admin / admin123
- Show user menu with role display

---

### Scene 3: Dashboard Overview (0:50-1:10)

**Show**: Main dashboard

**Say**:
> "The dashboard provides real-time visibility into operations - active work orders, pending quality checks, batches in process, and system alerts."

**Actions**:
- Point out key metrics
- Show quick action buttons
- Hover over charts

---

### Scene 4: Barcode Scanning (1:10-1:40)

**Show**: Battery Receipt page

**Say**:
> "Our barcode system supports both camera scanning and USB scanners. Let me demonstrate creating a new battery batch."

**Actions**:
- Navigate to Battery Receipt
- Click "Scan" button
- Show barcode scanner modal
- Enter sample data
- Click "Create Receipt & Print Labels"
- Show label preview

---

### Scene 5: Work Orders (1:40-2:00)

**Show**: Work Orders page

**Say**:
> "Production is managed through work orders with full lifecycle tracking from pending to completion."

**Actions**:
- Navigate to Work Orders
- Show list of orders
- Click on one work order
- Show "Start" and "Complete" actions

---

### Scene 6: Hazardous Waste Compliance (2:00-2:30)

**Show**: Hazardous Waste page

**Say**:
> "Compliance is critical. Our system tracks EPA manifests, monitors accumulation times, and alerts when approaching 90-day limits."

**Actions**:
- Navigate to Hazardous Waste
- Show manifest list
- Point out compliance alerts
- Show "New Manifest" button

---

### Scene 7: Inventory & Traceability (2:30-2:50)

**Show**: Inventory and Traceability pages

**Say**:
> "Complete traceability from inbound batteries through recovered materials, with multi-warehouse inventory management."

**Actions**:
- Show Inventory page with stock levels
- Navigate to Traceability
- Show batch genealogy timeline

---

### Scene 8: Call to Action (2:50-3:00)

**Show**: GitHub repository again

**Say**:
> "Battery ERP is production-ready and open-source. Star the repository, contribute features, or deploy it for your operation. Link in the description!"

**Actions**:
- Back to GitHub
- Point to Star button
- Show documentation links

---

## 🎯 Recording Tips

### Before Recording

- [ ] Close unnecessary applications
- [ ] Disable notifications
- [ ] Clean up desktop
- [ ] Set display to 1920x1080
- [ ] Test audio levels
- [ ] Have script visible

### During Recording

- Speak clearly and slowly
- Pause between sections (edit later)
- Move mouse smoothly
- Don't rush - you can speed up in editing

### After Recording

- Trim beginning/end
- Add intro/outro if desired
- Add background music (optional)
- Export as MP4 (H.264, 1080p)
- Upload to YouTube

---

## 📤 Upload to YouTube

1. **Go to**: https://youtube.com/upload

2. **Upload Settings**:
   - Title: "Battery ERP - Open Source Battery Recycling Management System"
   - Description: Include repository link
   - Tags: battery, erp, open-source, recycling, manufacturing
   - Thumbnail: Create custom thumbnail (1280x720)

3. **Visibility**: Public

4. **Share Link**: Add to README.md

---

## 🎨 Thumbnail Design

Use Canva (free) or similar:

**Template**:
- Screenshot of dashboard
- Large text: "Battery ERP Demo"
- Subtitle: "3-Minute Product Tour"
- GitHub logo
- Your branding

**Size**: 1280x720 pixels

---

## 📊 After Publishing

Update these files with video link:

1. **README.md**: Add video embed at top
2. **docs/DEPLOYMENT.md**: Link in Quick Start
3. **GITHUB_SETUP_COMPLETE.md**: Update status

---

## Alternative: Screenshot Tour

If video isn't possible, create a screenshot walkthrough:

1. Take screenshots of each page
2. Add annotations (arrows, text)
3. Create markdown document
4. Upload to `/docs/screenshots/`

---

**Need help?** Create an issue on GitHub and I'll provide feedback on your draft video!
