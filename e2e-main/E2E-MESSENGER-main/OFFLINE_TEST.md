# Complete Offline Test Guide

## Pre-Flight Checklist

### 1. Environment Setup
```bash
# Check Node.js version (should be >= 18)
node --version

# Check npm version
npm --version
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Client dependencies
cd client && npm install && cd ..
```

### 3. Build Client
```bash
cd client && npm run build && cd ..
```

---

## Complete Feature Test (Offline)

### Step 1: Start Server
```bash
npm start
```

**Verify:** Server starts on `http://localhost:3000`

### Step 2: Get Local IP Address
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Note the IP (e.g., `192.168.1.5`)

### Step 3: Disconnect Internet
- Turn off WiFi or disconnect ethernet
- Keep local network active (router must be on)

### Step 4: Test on Same Device
1. Open browser: `http://localhost:3000`
2. Create account or use legacy mode
3. Create a room
4. Open second tab: `http://localhost:3000`
5. Join the room with different username

**Expected:** Both tabs can chat in real-time

### Step 5: Test on Different Devices (Same WiFi)
1. Device A (Server): `http://localhost:3000`
2. Device B: `http://192.168.1.5:3000` (replace with actual IP)
3. Create room on Device A
4. Join from Device B

**Expected:** Cross-device messaging works

---

## Feature-by-Feature Test

### ✅ Authentication (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Register | Fill form, click "Create Account" | Account created, redirected to home |
| Login | Enter credentials, click "Sign In" | Logged in, redirected to home |
| Legacy Mode | Click "Use Legacy Mode", enter username | Entered room selection |

### ✅ Room Management (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Create Room | Click "Create Room" | Room created, 6-digit code shown |
| Join Room | Click "Join Room", enter code | Joined room, see chat interface |
| Room Info | Click info icon in header | QR code, encryption details shown |
| Members List | Click members icon | List of room members shown |

### ✅ Messaging (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Send Text | Type message, press Enter | Message appears in chat |
| Send File | Click attachment, select file | File uploaded, message sent |
| Typing Indicator | Start typing | Others see "X is typing..." |
| Encryption | Send any message | Lock icon shown on messages |

### ✅ Screenshot Detection (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Enable Detection | Click camera icon (enabled state) | Icon shows enabled |
| Take Screenshot | Press PrintScreen | Warning appears: "⚠️ [You] took a screenshot" |
| Other Users See | On other device | Warning: "⚠️ [Username] took a screenshot" |
| Disable Detection | Click camera icon (disabled state) | Icon shows disabled |

### ✅ Blur on Unfocus (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Enable Blur | Click eye icon (enabled state) | Icon shows enabled |
| Switch Tab | Open new tab, wait 500ms | Messages blur |
| Switch App | Alt+Tab to different app, wait 500ms | Messages blur |
| Unblur | Click on blurred overlay | Messages unblur |
| Disable Blur | Click eye icon (disabled state) | Icon shows disabled |

### ✅ Message Deletion (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Delete for Everyone | Right-click own message → "Delete for Everyone" | Message removed for all |
| Delete for Me | Right-click any message → "Delete for Me" | Message removed for you only |
| System Message | After deletion | "🗑️ [Username] deleted a message" shown |

### ✅ File Sharing (Offline)
| Test | Steps | Expected |
|------|-------|----------|
| Upload Image | Click attachment, select image | Image preview shown |
| Upload Document | Click attachment, select PDF/DOC | File info shown with download |
| Download | Click on file attachment | File downloads |
| Encryption Badge | Look at attachment button | 🔒 badge shown |

---

## Troubleshooting

### "Cannot connect to server"
- Check firewall settings
- Ensure port 3000 is not blocked
- Try different port: `PORT=3001 npm start`

### "Screenshot detection not working"
- Some browsers block PrintScreen detection
- Try using the toggle button to re-enable
- Check browser console for errors

### "Blur not triggering"
- Ensure "Blur on Unfocus" is enabled
- Wait 500ms after switching tabs
- Check if browser allows visibility API

### "Messages not deleting"
- Only message sender can delete
- Right-click must be on message bubble
- Check browser console for errors

### "File upload fails"
- Check file size (max 10MB)
- Ensure file type is allowed
- Check browser console for errors

---

## Verification Commands

```bash
# Test server is running
curl http://localhost:3000/api/health

# Test client build exists
ls client/dist/index.html

# Check all dependencies installed
ls node_modules/express
ls client/node_modules/react
```

---

## Success Criteria

✅ All tests passed if:
1. Server starts without errors
2. Client loads in browser
3. Account creation/login works
4. Room creation/joining works
5. Messages send/receive in real-time
6. Screenshot detection triggers
7. Blur on unfocus works
8. Message deletion works
9. File upload/download works
10. All features work WITHOUT internet connection

**Your E2E Messenger is fully functional and offline-ready!**
