# Mobile Responsive Design

## Overview
SecureChat is fully responsive and works great on mobile devices - smartphones and tablets.

## Breakpoints

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| Desktop | > 1024px | Laptops, Desktops |
| Tablet | 768px - 1024px | iPads, Tablets |
| Mobile Large | 481px - 767px | Large phones |
| Mobile Small | <= 480px | Small phones |
| Landscape | <= 500px height | Landscape phones |

## Mobile Features

### 📱 Touch-Friendly Interface
- All buttons are at least 44x44px (Apple HIG compliant)
- Touch targets have adequate spacing
- No hover-dependent actions (mobile uses touch)

### 📱 Adaptive Layout
- **Auth/Home pages**: Cards stack vertically, full width on small screens
- **Room page**: 
  - Header compresses to fit small screens
  - Messages take full width (95% on mobile)
  - Composer stays at bottom with larger touch targets
  - Sidebar becomes full-screen overlay

### 📱 Mobile-Specific Interactions

#### Message Deletion
- **Desktop**: Right-click on message → Delete options
- **Mobile**: Long-press (600ms) on message → Delete options

#### Screenshot Detection
- Works on mobile browsers
- Detects volume + power button combinations
- Shows warning to all room members

#### Blur on Unfocus
- Works when switching apps on mobile
- Blurs when opening recent apps
- Tap to unblur

### 📱 Responsive Typography
- Font sizes scale down on smaller screens
- Minimum 16px for inputs (prevents iOS zoom)
- Comfortable reading sizes on all devices

### 📱 Optimized for Mobile Browsers
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```

### 📱 PWA Ready
- Can be added to home screen
- Works as standalone app
- Theme color matches app

## Testing on Mobile

### Method 1: Same WiFi Network
1. Start server on computer: `npm start`
2. Find computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. On phone browser: `http://192.168.1.x:3000`
4. Works completely offline on local network!

### Method 2: USB Debugging
1. Connect phone to computer via USB
2. Enable USB debugging on phone
3. Use Chrome DevTools remote debugging
4. Access `localhost:3000` through forwarded port

### Method 3: Browser DevTools
1. Open browser DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select phone model from dropdown
4. Test responsive design

## Mobile UI Adjustments

### Small Screens (<= 480px)
- Status bar height: 48px (compact)
- Card padding reduced
- Message bubbles: 95% width
- Composer: Compact buttons
- Font size: 16px minimum (prevents zoom)

### Medium Screens (481px - 767px)
- Status bar height: 52px
- Cards: Full width with padding
- Message bubbles: 90% width
- Standard touch targets

### Tablets (768px - 1024px)
- Status bar height: 52px
- Cards: Max 480px width
- Message bubbles: 75% width
- Sidebar can be permanent

## Accessibility

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Disables animations for users who prefer reduced motion */
}
```

### Touch Action
```css
/* Prevents double-tap zoom delays */
touch-action: manipulation;
```

### Color Scheme
- Respects system dark mode preference
- Uses `prefers-color-scheme` media query

## Tips for Mobile Users

1. **Add to Home Screen**: Use "Add to Home Screen" in browser menu for app-like experience
2. **Landscape Mode**: Works great in landscape for more message space
3. **Pull to Refresh**: Not needed - messages update in real-time
4. **Keyboard**: Emoji keyboard works for reactions

## Known Mobile Limitations

1. **Background Notifications**: Requires service worker (not implemented yet)
2. **File Upload**: Limited by mobile browser file picker
3. **Screenshot Detection**: May not detect all screenshot methods on iOS

## Mobile Performance

- Lightweight CSS (~35KB)
- No heavy animations on mobile
- Efficient re-rendering with React
- Web Crypto API works on all modern mobile browsers

---

**Tested on:**
- iOS Safari (iPhone 12, iPad Pro)
- Android Chrome (Pixel, Samsung Galaxy)
- Mobile Firefox
- Various screen sizes via DevTools
