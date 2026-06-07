# Deploy, Build (APK/iOS) & OTA Release Guide

This is the end-to-end runbook for putting the to-do app in real users' hands and
shipping over-the-air (OTA) updates afterwards.

Three pieces:
1. **Deploy the backend** (Bun + Elysia + Postgres) to a public HTTPS URL.
2. **Build the app** — a universal Android **APK** (any device) and an **iOS** build.
3. **Ship OTA updates** — change JS/assets, publish, users auto-update on next launch.

> **The single most important rule:** OTA only works in a **real build** (APK / IPA
> from a `preview` or `production` profile). It does **NOT** work in Expo Go or a dev
> server. All your testing so far was in Expo Go, where "Check for updates" is inert by
> design. Build the APK below, then OTA becomes live.

---

## Part 1 — Deploy the backend

The backend must be reachable by phones over the internet, on **HTTPS** (iOS blocks
plain HTTP by default, and you want TLS regardless). You need: a host, Postgres, the
Bun server, a reverse proxy with TLS, and the OTA signing key.

This guide uses **Oracle Cloud "Always Free"** — a genuinely **$0-forever** Linux VM that
runs everything as-is (Bun + Postgres + the OTA bundle disk). The card Oracle asks for is
for **identity verification only**; Always-Free resources are not billed as long as you
stay within the Always-Free limits.

> Why not the "easy" hosts? **Firebase / Netlify / Cloud Functions can't run this backend
> at all** — no PostgreSQL, Node-only (not Bun), and no persistent disk for OTA bundles.
> **Fly.io / Render** *can* run it but are pay-as-you-go (a few $/month) — not free.



### 1.1 Create the Always-Free VM, open ports, get a free domain

**a) Create the instance.** In the Oracle Cloud console → **Compute → Instances → Create**:
- **Shape:** pick an **Always-Free-eligible** shape — `VM.Standard.A1.Flex` (Ampere ARM, up
  to 4 OCPU / 24 GB free) is best; if you hit "out of capacity", use `VM.Standard.E2.1.Micro`
  (AMD, also Always Free) or try another Availability Domain/region.
- **Image:** Ubuntu 22.04.
- **SSH:** upload your public key. Note the instance's **public IP**.

**b) Open the network ports (two layers — this is the #1 Oracle gotcha).**
- *VCN security list:* Networking → your VCN → the subnet's **Security List** → add **Ingress**
  rules allowing TCP **80** and **443** (and **22**) from `0.0.0.0/0`.
- *OS firewall:* Oracle's Ubuntu image also blocks ports with iptables. SSH in and run:
  ```bash
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
  ```

**c) Free HTTPS domain (no purchase).** iOS/Android release builds require HTTPS, so you need
a domain + TLS. Get a free subdomain at **[duckdns.org](https://www.duckdns.org)** (sign in,
create `to-do-list`, set its IP to your instance's public IP) → you get
`to-do-list.duckdns.org`. (Any domain works; DuckDNS is the free option.)

### 1.2 Install Bun, Docker, git + get the code
```bash
# on the VM (Ubuntu), via SSH
sudo apt-get update -y && sudo apt-get install -y git
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc        # Bun
curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER   # Docker (runs Postgres) — re-login after
git clone https://github.com/NithinReddy088/to-do-list.git todo && cd todo/apps/server
bun install
```

### 1.3 Postgres
Either use the bundled docker-compose, or a managed Postgres.

**Bundled (simplest):**
```bash
# docker-compose.yml maps host 5433 -> container 5432
docker compose up -d
```
**Managed:** create a Postgres DB and use its connection string (port 5432).

### 1.4 Environment
Copy the production template and fill it in:
```bash
cp env/.env.production.example env/.env.production
# then edit env/.env.production:
```
- `DATABASE_URL` — your Postgres URL (host `localhost:5433` for the bundled one, or the managed URL).
- `JWT_SECRET` — `openssl rand -base64 48`
- `ADMIN_PUBLISH_TOKEN` — `openssl rand -hex 32` (you'll need this to publish OTA updates)
- `PUBLIC_BASE_URL` — `https://to-do-list.duckdns.org` (your public HTTPS URL — the app downloads OTA bundles from here)
- `UPDATES_STORAGE_DIR` — `./updates` (where OTA bundles are stored; put it on a persistent disk)
- `CODE_SIGNING_PRIVATE_KEY_PATH` — `./keys/private-key.pem`

### 1.5 Generate the OTA signing key (once)
```bash
bun run codesign:generate     # writes keys/private-key.pem + keys/public-key.pem
```
Keep `private-key.pem` on the server only (it's gitignored). The server signs every
manifest with it.

### 1.6 Migrate the database
```bash
bun run --env-file=env/.env.production x prisma migrate deploy
```

### 1.7 Run the server (process manager)
Run it under a supervisor so it restarts on crash/reboot. Example with **pm2**:
```bash
bun add -g pm2
pm2 start "bun run --env-file=env/.env.production src/index.ts" --name todo-api
pm2 save && pm2 startup
```
Or a **systemd** unit, or `docker`. The server listens on `PORT` (default 4000) on all
interfaces.

### 1.8 Reverse proxy + free TLS (nginx + certbot)
Terminate HTTPS at nginx and forward to the Bun server. **Important:** OTA publish
uploads the whole JS bundle in one request (~10 MB), so raise the body limit.
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/todo >/dev/null <<'EOF'
server {
  server_name to-do-list.duckdns.org;
  client_max_body_size 50m;          # required for OTA publish uploads
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
EOF
sudo ln -sf /etc/nginx/sites-available/todo /etc/nginx/sites-enabled/todo
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d to-do-list.duckdns.org    # free Let's Encrypt TLS (auto-renews)
```
Verify: `curl https://to-do-list.duckdns.org/health` → `{"status":"ok"}`.

---

## Part 2 — Configure the app for production

The public URLs are baked into the build at compile time from `apps/mobile/.env.prod`.
```bash
cd apps/mobile
cp .env.prod.example .env.prod
# edit .env.prod:
#   APP_ENV=prod
#   API_BASE_URL=https://to-do-list.duckdns.org
#   UPDATES_URL=https://to-do-list.duckdns.org/api/manifest
#   CODE_SIGNING_CERTIFICATE=        (leave empty unless you enable client-side verification — see Part 5)
```
`runtimeVersion` stays `"1.0.0"` (in `app.config.ts`). Every build and every published
update share this value — that's how the server knows which update is compatible.

---

## Part 3 — Build a universal Android APK (any device)

The `production` profile in `eas.json` produces a **single universal APK** (arm64-v8a +
armeabi-v7a + x86/_64) that installs on essentially any Android phone/emulator.

### Option A — EAS Build (cloud, recommended, free tier)
```bash
cd apps/mobile
bun add -g eas-cli
eas login                                  # free Expo account
APP_ENV=prod eas build -p android --profile production
```
EAS builds it in the cloud and gives a download link → that `.apk` installs on any
Android device (enable "install from unknown sources"). Free tier has a monthly build
quota; it's plenty for releases.

### Option B — Local build (fully free, no Expo account)
Needs Android SDK + JDK 17 installed locally.
```bash
cd apps/mobile
APP_ENV=prod npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```
This is a universal release APK. (`npx expo run:android --variant release` builds and
installs it on a connected device in one step.)

> Distribute the APK however you like (direct download, MDM, Play Store internal track).
> For Google Play you'd instead build an `.aab` (add an app-bundle profile), but an APK
> is fine for direct install on "any Android".

---

## Part 4 — Build for iOS

iOS is gated by Apple, not by this code:
- **Simulator (free, on a Mac):** `APP_ENV=prod eas build -p ios --profile development` (has `ios.simulator: true`) or `npx expo run:ios`.
- **Real device / TestFlight / App Store:** requires a **paid Apple Developer account ($99/yr)**.
  ```bash
  APP_ENV=prod eas build -p ios --profile production    # cloud build, prompts for Apple creds
  # or open the prebuilt project in Xcode on a Mac and archive
  ```
OTA works on iOS exactly like Android once the app is installed — only the initial
build/distribution needs the Apple account + a Mac (or EAS cloud with Apple creds).

---

## Part 5 — Ship OTA updates (the whole point)

Once users have the APK/IPA installed, you push JS/asset changes without making them
reinstall.

### 5.1 The workflow
1. Make your change (screens, logic, styles, images — anything JS/asset).
2. Publish for each platform, pointing at your **production** server:
   ```bash
   cd apps/mobile

   PLATFORM=android \
   RUNTIME_VERSION=1.0.0 \
   CHANNEL=production \
   SERVER_BASE_URL=https://to-do-list.duckdns.org \
   ADMIN_PUBLISH_TOKEN=<the token from .env.production> \
   bun run publish:update

   # repeat with PLATFORM=ios
   ```
   This runs `expo export`, uploads the bundle to your server, and the **server builds +
   signs the manifest** and records it as the latest update for that `runtimeVersion`.
3. Users get it automatically: the app checks on launch (and via **Settings → Check for
   updates**), downloads the new bundle, and applies it on the **next app launch**.

### 5.2 What OTA can and cannot do
- ✅ **Can** ship: JS/TS code, React components, styles, images/fonts, most config.
- ❌ **Cannot** ship: new **native** modules or native config (e.g. adding a new
  `expo-*`/native library, changing app icon/permissions). Those require a **new build**
  and a **`runtimeVersion` bump**, then redistribute the APK/IPA.

### 5.3 runtimeVersion discipline
- The installed build and the published update must share the **same `runtimeVersion`**.
  If they differ, the app won't see the update (that's the safety mechanism).
- JS-only change → keep `runtimeVersion: "1.0.0"`, just `publish:update`.
- Added/updated a native dependency → bump `runtimeVersion` (e.g. `"1.1.0"`) in
  `app.config.ts`, rebuild the APK/IPA, redistribute, then publish updates under the new
  version.

### 5.4 Verify an update end-to-end
```bash
# what the app will fetch:
curl -s -D - "https://to-do-list.duckdns.org/api/manifest" \
  -H "expo-platform: android" -H "expo-runtime-version: 1.0.0" \
  -H "expo-channel-name: production" -H "expo-protocol-version: 1" | head -30
# -> 200, multipart/mixed, contains the new update id + expo-signature,
#    and asset URLs pointing at https://to-do-list.duckdns.org/api/assets...
```

---

## Part 6 — (Optional) Enable client-side signature verification

The server already **signs** every manifest, and the signature verifies cryptographically.
To make the **app reject tampered manifests** too, enable Expo code signing:
1. `cd apps/mobile && npx expo-updates codesigning:generate --key-output-directory keys --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name "Todo"`
2. Configure: `npx expo-updates codesigning:configure` (sets `codeSigningCertificate` +
   `codeSigningMetadata` in the config).
3. Have the server sign with the matching key (replace `apps/server/keys/private-key.pem`
   with the codesigning private key, or sign using it).
4. Rebuild and redistribute the app (the certificate is embedded at build time).
Until then OTA runs **unsigned on the client** — updates still download and apply; they
just aren't cryptographically verified on-device. For a first release this is fine.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| "Check for updates" never finds anything in Expo Go | Expected — OTA needs a real build (Part 3/4), not Expo Go. |
| Publish request fails with **413** | Reverse proxy body limit too small — set `client_max_body_size 50m` (nginx) or the platform equivalent. |
| App can't reach API / assets on a real device | `PUBLIC_BASE_URL` / `API_BASE_URL` must be the **public HTTPS** URL, not localhost/LAN. iOS requires HTTPS. Republish after fixing `PUBLIC_BASE_URL`. |
| Update published but app doesn't pick it up | `runtimeVersion` mismatch between the installed build and the published update, or wrong `CHANNEL`. They must match. |
| Asset 404 on device | The update was published with a `PUBLIC_BASE_URL` the device can't reach. Set it to the real public URL and republish. |
| `bun run test` wiped my data | Tests share the DB and clear it. Use a **separate** `DATABASE_URL` for the deployed/prod DB; never run tests against it. |

---

## Quick reference

```bash
# Deploy backend (server host)
cp env/.env.production.example env/.env.production   # fill secrets + PUBLIC_BASE_URL
bun run codesign:generate
bun run --env-file=env/.env.production x prisma migrate deploy
pm2 start "bun run --env-file=env/.env.production src/index.ts" --name todo-api
# nginx + certbot in front, client_max_body_size 50m

# Build APK (any Android)
cd apps/mobile && cp .env.prod.example .env.prod     # set public URLs
APP_ENV=prod eas build -p android --profile production   # or local gradlew assembleRelease

# Ship an OTA update (after the build is in users' hands)
PLATFORM=android RUNTIME_VERSION=1.0.0 SERVER_BASE_URL=https://to-do-list.duckdns.org \
  ADMIN_PUBLISH_TOKEN=*** bun run publish:update
PLATFORM=ios ... bun run publish:update
```
