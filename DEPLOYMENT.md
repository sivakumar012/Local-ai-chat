# Local Network Deployment — Active

**Status:** ✅ Running  
**Started:** 2026-04-28  
**Mode:** Local network (LAN)

---

## Access URLs

| Device | URL |
|--------|-----|
| **This machine** | http://localhost:3000 |
| **Same network** | http://192.168.31.9:3000 |

Share `http://192.168.31.9:3000` with teammates on the same WiFi/LAN.

---

## Server Process

```bash
# Running in background (terminal ID: 2)
npx next start -H 0.0.0.0 -p 3000
```

**To stop:**
```bash
# Find the process
lsof -ti:3000 | xargs kill
```

**To restart:**
```bash
npm run build
npx next start -H 0.0.0.0 -p 3000
```

---

## ⚠️ Google OAuth Setup Required

**Current state:** OAuth credentials are placeholders — sign-in will fail.

### To enable Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web application
4. Add **Authorized redirect URI**:
   ```
   http://192.168.31.9:3000/api/auth/callback/google
   ```
5. Copy Client ID and Client Secret
6. Update `.env.local`:
   ```env
   AUTH_GOOGLE_ID=<your-client-id>
   AUTH_GOOGLE_SECRET=<your-client-secret>
   ```
7. Restart the server

---

## Environment Configuration

**File:** `.env.local` (not committed to git)

```env
LLM_BASE_URL=http://127.0.0.1:1234
LLM_API_PATH=/v1/chat/completions

AUTH_SECRET=c0acdd75fc6a3106b8e2c55dc2419c8dd482fb0a06ca6228f991cee1a8262c68
AUTH_GOOGLE_ID=YOUR_GOOGLE_CLIENT_ID          # ⚠️ PLACEHOLDER
AUTH_GOOGLE_SECRET=YOUR_GOOGLE_CLIENT_SECRET  # ⚠️ PLACEHOLDER
NEXTAUTH_URL=http://192.168.31.9:3000
```

---

## Firestore

**Project:** `prepforexams-aabbd`  
**Database:** `(default)` in region `nam5`  
**Rules:** Deployed ✅  
**Indexes:** Deployed ✅

All conversations and messages are persisted to Firestore under `/users/{userId}/...`

---

## LM Studio

**Expected URL:** `http://127.0.0.1:1234`  
**Endpoint:** `/v1/chat/completions`

LM Studio must be running on **this machine** (192.168.31.9) for the app to work. Teammates' requests will proxy through this server to your local LM Studio instance.

**To start LM Studio:**
1. Open LM Studio
2. Load a model (e.g., Gemma 4 E4B)
3. Go to Local Server tab
4. Click "Start Server"
5. Verify it shows `Running on http://127.0.0.1:1234`

---

## Logs

**Location:** stdout (terminal where server is running)  
**Format:** JSON lines in production mode

To view logs:
```bash
# If running in background, check the process output
tail -f /path/to/log/file
```

All API requests, Firestore operations, and errors are logged with structured events.

---

## Troubleshooting

**Can't access from another device:**
- Verify both devices are on the same network (same WiFi)
- Check firewall isn't blocking port 3000
- Try `http://192.168.31.9:3000` in a browser on the other device

**Sign-in fails:**
- Google OAuth credentials must be real (not placeholders)
- Redirect URI in Google Console must exactly match `http://192.168.31.9:3000/api/auth/callback/google`

**LLM not responding:**
- Verify LM Studio is running on this machine
- Check the Local Server tab shows "Running"
- Test connection from the app's setup screen

**IP address changed:**
- Run `ifconfig | grep "inet " | grep -v 127.0.0.1` to get new IP
- Update `NEXTAUTH_URL` in `.env.local`
- Update redirect URI in Google Cloud Console
- Restart the server

---

## Next Steps

1. **Set up Google OAuth** (see section above) — required for sign-in
2. **Share the URL** — `http://192.168.31.9:3000` with teammates
3. **Keep this machine on** — server must stay running for others to access
4. **Keep LM Studio running** — all chat requests proxy to your local instance

---

## Security Notes

- This deployment is **local network only** — not accessible from the internet
- All traffic is HTTP (not HTTPS) — fine for trusted LANs, not for public networks
- Each user's conversations are isolated by Firestore security rules (owner-only access)
- LM Studio never leaves this machine — all inference is local
