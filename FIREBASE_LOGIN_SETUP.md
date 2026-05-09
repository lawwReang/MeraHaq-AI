# Firebase Google Sign-In Setup Guide

## Issue: "Failed to sign in with Google" on Network IP Domain

When accessing the app via a network IP address (e.g., `192.168.x.x:3000` instead of `localhost:3000`), Google Sign-In fails. This is because **Firebase requires all authentication domains to be explicitly authorized**.

---

## Solution: Authorize Your Domain in Firebase Console

### Step 1: Get Your Current Domain

Open your browser and check the URL:
- **Network IP example**: `http://192.168.1.100:3000`
- **Domain to authorize**: `192.168.1.100:3000`

### Step 2: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **soy-bridge-494918-e2**
3. Click **Authentication** in the left sidebar
4. Go to **Settings** tab

### Step 3: Add Authorized Domain

1. Scroll down to **Authorized Domains** section
2. Click **Add domain** button
3. Enter your domain:
   - **For network IP**: `192.168.1.100:3000` (without `http://`)
   - **For localhost**: `localhost:3000`
   - **For deployed URL**: Your actual domain

⚠️ **Important**: Include the port number (`:3000`) in the domain

### Step 4: Save and Wait

- Click **Add**
- Firebase will save the change (usually instant, but may take 2-3 minutes to propagate)

### Step 5: Test the Login

1. Reload your application (refresh browser)
2. Click the **Login with Google** button
3. The popup should now appear without errors

---

## Common Issues & Solutions

### Issue 1: "Popup Blocked" Error

**Cause**: Browser popup blocker is preventing the login window

**Solution**:
1. Look for popup blocker icon in your browser address bar
2. Click it and select "Always allow popups for this site"
3. Refresh the page and try logging in again

### Issue 2: "Network Error" or "CORS" Error

**Cause**: Your network may be blocking requests to Google's authentication servers

**Solutions**:
1. **Check Internet Connection**:
   - Verify you have working internet
   - Try accessing https://google.com first

2. **Check Firewall Rules**:
   - Corporate firewalls may block authentication
   - Try from a different network
   - Contact IT if on corporate network

3. **Use Localhost Instead**:
   - Instead of network IP, access via `http://localhost:3000`
   - Then authorize `localhost:3000` in Firebase

### Issue 3: "Operation not supported in this environment"

**Cause**: Domain is not authorized in Firebase

**Solution**:
- Verify you've added your domain to **Authorized Domains** (see steps above)
- Wait 2-3 minutes for Firebase to propagate changes
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

### Issue 4: Login Works on Localhost but Not Network IP

**Cause**: Network IP domain not authorized

**Solution**:
- Authorized Domains list has separate entries for:
  - `localhost:3000` ❌ (doesn't work for network IP)
  - `192.168.x.x:3000` ✅ (needed for network IP)
- Add your specific network IP domain to the list

---

## OAuth Client ID Configuration

Your Firebase project uses Google OAuth. The credentials are automatically linked:

**Firebase Project**: soy-bridge-494918-e2  
**OAuth Credentials**: Configured in GCP project (same project ID)

### If OAuth isn't working:

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find the **Web application** OAuth client ID
4. Under **Authorized JavaScript origins**, verify:
   - ✅ `http://localhost:3000`
   - ✅ `http://192.168.x.x:3000` (your network IP)
   - ✅ Your production domain (if deployed)

---

## Quick Reference: What to Authorize

| Access Method | Domain to Add | Notes |
|---|---|---|
| Local development | `localhost:3000` | Default for `npm run dev` |
| Network IP | `192.168.x.x:3000` | Use your actual local IP |
| WiFi on same network | `hostname.local:3000` | If using mDNS |
| Production | `yourdomain.com` | Your deployed domain |

---

## Finding Your Network IP Address

### macOS / Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for `inet 192.168.x.x` or `inet 10.x.x.x`

### Windows:
```cmd
ipconfig
```

Look for "IPv4 Address" under your active network

### All Systems:
1. Open terminal/command prompt
2. Run the commands above
3. Your network IP is typically `192.168.x.x` or `10.x.x.x`

---

## Testing & Verification

### To verify your domain is authorized:

1. Open **Firebase Console**
2. Go to **Authentication** → **Settings**
3. Scroll to **Authorized Domains**
4. You should see your domain in the list

### To test authentication:

1. Access your app via the network IP
2. Click "Login with Google"
3. Popup should appear without errors
4. Complete Google Sign-In
5. You should be logged in

---

## Error Messages Reference

| Error Message | Likely Cause | Fix |
|---|---|---|
| "Popup blocked" | Browser blocking popups | Allow popups in browser settings |
| "Network error" / "CORS" | Network connectivity | Check internet, try different network |
| "Operation not supported" | Domain not authorized | Add to Authorized Domains in Firebase |
| "Invalid API key" | Firebase config error | Verify firebase-applet-config.json |
| "Popup closed by user" | User cancelled login | Try logging in again |

---

## Need More Help?

### Check These Files:
- **Firebase Config**: `firebase-applet-config.json` (do not modify)
- **Auth Handler**: `src/App.tsx` (handleLogin function)
- **Firebase Setup**: `src/lib/firebase.ts`

### Browser Console Debugging:
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Try logging in
4. Look for error details in the console
5. Share these details if asking for help

### Resources:
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [GCP Console](https://console.cloud.google.com/)
