# E2E Messenger - Feature Verification

## Offline Functionality Verification

### 1. Screenshot Detection ✅
**How it works:**
- Uses browser's native `keydown` event listener
- Detects PrintScreen key, Win+Shift+S, Cmd+Shift+3/4/5
- Emits warning via Socket.IO to room members
- **No internet required** - all detection happens client-side

**Test Steps:**
1. Join a room with 2+ users
2. Enable screenshot detection (camera icon in header)
3. Press PrintScreen key
4. Check if other users see: "⚠️ [Username] took a screenshot"

**Expected Result:** Warning message appears in chat for all room members

---

### 2. Blur-on-Unfocus ✅
**How it works:**
- Uses `visibilitychange` API for tab switching
- Uses `window.blur/focus` for app switching
- 500ms delay prevents accidental triggers
- **No internet required** - pure browser API

**Test Steps:**
1. Join a room
2. Enable blur (eye icon in header)
3. Switch to another tab or Alt+Tab to another app
4. Wait 500ms

**Expected Result:** Messages become blurred with overlay showing "Click to unblur messages"

---

### 3. Message Deletion ✅
**How it works:**
- Right-click on own message
- Choose "Delete for Everyone" or "Delete for Me"
- Socket.IO broadcasts deletion to room members
- **Works on local network** - no internet needed

**Test Steps:**
1. Send a message
2. Right-click on the message
3. Select "Delete for Everyone"
4. Check if message disappears for all users

**Expected Result:** 
- Message removed from all devices
- System message: "🗑️ [Username] deleted a message"

---

## Complete Offline Test Procedure

### Prerequisites
- Both devices on same WiFi/network
- Server running on one device
- Client accessible via local IP (e.g., `http://192.168.1.x:3000`)

### Test 1: Basic Messaging (Offline)
```
1. Disconnect internet (keep WiFi on)
2. Create room on Device A
3. Join room on Device B using room code
4. Send messages between devices
```
**Expected:** Messages encrypted and delivered via local network

### Test 2: Screenshot Detection (Offline)
```
1. Both devices in same room (offline)
2. Device A enables screenshot detection
3. Device A presses PrintScreen
```
**Expected:** Device B sees warning message

### Test 3: Blur on Unfocus (Offline)
```
1. Device A enables blur
2. Device A switches to different app
```
**Expected:** Messages blur on Device A

### Test 4: Message Deletion (Offline)
```
1. Device A sends message
2. Device A right-clicks and deletes for everyone
```
**Expected:** Message disappears on Device B

---

## Troubleshooting

### Screenshot detection not working
- Check if browser allows keyboard event interception
- Some browsers block PrintScreen detection for security
- Try using the toggle button to enable/disable

### Blur not working
- Check browser permissions for visibility API
- Some browsers restrict blur/focus events
- Ensure "Blur on Unfocus" is enabled in room header

### Message deletion not working
- Only message sender can delete
- Right-click must be on your own message bubble
- Check browser console for errors

---

## Technical Notes

### All Features Work Offline Because:
1. **Screenshot Detection:** Uses `document.addEventListener('keydown')` - pure client-side
2. **Blur on Unfocus:** Uses `document.addEventListener('visibilitychange')` - browser API
3. **Message Deletion:** Uses Socket.IO over local network - no external servers

### Data Flow (All Local):
```
Device A (Browser) ←→ Local WiFi ←→ Device B (Browser)
         ↑                              ↑
    JavaScript APIs               JavaScript APIs
    (Screenshot/Blur)             (Screenshot/Blur)
```

No data leaves your local network.
