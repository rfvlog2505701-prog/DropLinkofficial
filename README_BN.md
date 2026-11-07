# DropLink — Vercel build

এই build আগের DropLink upload server-ই ব্যবহার করে। **Firebase Storage ব্যবহার করে না।** Firebase শুধু Email/Password Authentication এবং Firestore-এ `My Files`-এর metadata রাখে। আসল file bytes আগের DropLink API-তেই যায়।

## ফাইলগুলোর কাজ

- `index.html` — সম্পূর্ণ বাংলা UI, ৬টি theme (Arctic Blue default), ৬টি drag/drop effect, upload queue, 20 MB / 200 MB UI validation, OTP login/register, QR Generator, My Files এবং recent upload history.
- `vercel.ts` — Vercel external rewrite. Browser `/api/upload/file`-এ multipart upload পাঠায়; Vercel আগের upload API-তে request forward করে এবং `UPLOAD_API_KEY` থেকে `X-API-Key` server-side বসায়.
- `api/otp/send.js`, `api/otp/verify.js` — OTP provider-এর server-side proxy. OTP bearer token browser-এ যায় না.
- `api/firebase-config.js` — Firebase web configuration environment থেকে browser-এ দেয়. Firebase web config public configuration; Firestore Rules data access control করে.
- `firestore.rules` — account-এর নিজের file metadata-তেই read/create/delete সীমাবদ্ধ.
- `ad-*.html` — সরবরাহ করা ad scripts আলাদা sandboxed iframe-এ চালায়.

এখানে Firebase Storage SDK, Firebase Storage rules বা Storage upload নেই।

## ১. Vercel Environment Variables

Vercel Dashboard → Project → **Settings → Environment Variables**-এ নিচের নামগুলো যোগ করো। `Production`, `Preview`, `Development`—যেসব environment-এ চালাতে চাও সেগুলো সিলেক্ট করো। Secret/token-এর ক্ষেত্রে Vercel-এর **Sensitive** option থাকলে সেটি চালু করো।

| Variable | Value / নির্দেশনা | Sensitive? |
|---|---|---|
| `UPLOAD_API_BASE_URL` | আগের HTML-এ ব্যবহৃত DropLink API origin: `https://droplink-a7b1.onrender.com` | না |
| `UPLOAD_API_KEY` | DropLink upload API-এর **নতুন/rotated active key** | হ্যাঁ |
| `OTP_API_BASE_URL` | OTP service origin: `https://cloudnest.pythonanywhere.com` | না |
| `OTP_API_TOKEN` | OTP service-এর Bearer token; chat-এ দেওয়া token rotate করে নতুন token বসাও | হ্যাঁ |
| `FIREBASE_API_KEY` | তোমার Firebase config-এর `apiKey` | না* |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` | না |
| `FIREBASE_DATABASE_URL` | `databaseURL` | না |
| `FIREBASE_PROJECT_ID` | `projectId` | না |
| `FIREBASE_STORAGE_BUCKET` | `storageBucket` (এই build-এ Storage ব্যবহার হয় না; config completeness-এর জন্য রাখা) | না |
| `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | না |
| `FIREBASE_APP_ID` | `appId` | না |
| `FIREBASE_MEASUREMENT_ID` | `measurementId` | না |

`*` Firebase Web API key সাধারণত public client configuration; এটিকে server-side authorization secret মনে করা যাবে না। Firestore Rules-ই database data access সীমাবদ্ধ করে।

`UPLOAD_API_KEY` এবং `OTP_API_TOKEN`-এ পুরোনো/চ্যাটে প্রকাশিত token ব্যবহার কোরো না। নতুন token rotate করে Vercel-এর Sensitive variable-এ বসাও। এগুলো source code বা GitHub-এ লিখবে না।

## ২. Firebase setup

1. Firebase Console → Authentication → Sign-in method → **Email/Password** enable করো.
2. Firestore Database তৈরি করো.
3. Firestore → Rules-এ এই project-এর `firestore.rules` content paste করে Publish করো.
4. Authentication → Settings → Authorized domains-এ তোমার `*.vercel.app` domain এবং custom domain যোগ করো.
5. Firebase Storage তৈরি করার দরকার নেই. এই website-এর file upload Firebase-এ যায় না.

এই build Firestore-এ ফাইলের নাম, size, URL, owner UID এবং created time রাখে। Guest upload history শুধু ওই browser-এর localStorage-এ থাকে।

## ৩. Vercel deploy

### GitHub দিয়ে

1. এই পুরো `DropLink_Vercel` folder-এর ফাইলগুলো GitHub repository-র root-এ রাখো.
2. Vercel → Add New → Project → repository Import করো.
3. Project Settings → Environment Variables-এ উপরের সব variable যোগ করো.
4. Deploy করো. প্রথম deploy-এর আগে `UPLOAD_API_BASE_URL` ও `UPLOAD_API_KEY` অবশ্যই বসানো থাকতে হবে, কারণ `vercel.ts` build-time-এ এগুলো পড়ে.
5. Variable বদলালে **Redeploy** করো.

### CLI দিয়ে

```bash
npm install
npx vercel login
npx vercel link
npx vercel dev
```

লোকাল `vercel dev` চালাতে `.env.local`-এ `.env.example`-এর variable name-গুলো বসাও। `.env.local` GitHub-এ commit কোরো না। Production deploy:

```bash
npx vercel deploy --prod
```

## ৪. Upload policy

- `0–20,000,000 bytes` (20 MB inclusive): Guest upload.
- `20,000,001–200,000,000 bytes` (20 MB-এর বেশি, 200 MB inclusive): OTP-সহ login/register প্রয়োজন.
- `200,000,000 bytes`-এর বেশি: UI-তে reject.
- Upload একই পুরোনো `/api/upload/file` endpoint-এ যায়; multipart field `file` এবং `shorten=true`, আগের app-এর মতোই.

**গুরুত্বপূর্ণ server-side সীমাবদ্ধতা:** এই project UI-তে ২০/২০০ MB যাচাই করে, কিন্তু শুধুমাত্র HTML/JavaScript দিয়ে কেউ সরাসরি proxy URL-এ request পাঠিয়ে এই client-side gate এড়াতে পারে। সত্যিকার enforce করতে হলে DropLink upload API backend-এও সর্বোচ্চ ২০০ MB এবং guest/account policy enforce করতে হবে। API backend-এ Firebase ID token যাচাই করার সুবিধা না থাকলে OTP/login policy-ও backend-এ সম্পূর্ণ নিরাপদভাবে enforce হয় না। এই build-এর supplied upload API contract-এ authenticated upload/session বা delete endpoint দেওয়া ছিল না, তাই সেগুলো বানিয়ে ধরে নেওয়া হয়নি.

Vercel upload path-টি **Function নয়, external rewrite**; তাই 4.5 MB Vercel Function request-body cap এড়ানো হয়। Vercel proxied request timeout বর্তমানে 120 seconds; বড় file slow network-এ এর বেশি সময় নিলে upload fail করতে পারে। Upload API বা Vercel-এর বর্তমান plan/region-এর কার্যকর সীমাও পরীক্ষা করে নিও.

## ৫. Ads

সরবরাহ করা banner script এবং দুইটি third-party JavaScript ad পৃথক sandboxed iframe-এ রাখা হয়েছে; এদের main DropLink page-এর DOM-এ সরাসরি access নেই। এই snippets **Google AdSense-এর standard AdSense code নয়**—এগুলো অন্য ad network/domain-এর code. Sandbox/popup restriction-এর কারণে কোনো format আংশিক কাজ নাও করতে পারে; live deployment-এ ad network dashboard ও browser console দিয়ে পরীক্ষা করো। অতিরিক্ত redirect/pop-up বেশি হলে সংশ্লিষ্ট iframe সরিয়ে দাও.

## ৬. Launch-এর আগে test

- ১ MB guest upload এবং ২০ MB guest upload.
- ২০ MB-এর একটু বেশি file দিলে OTP gate আসে কি না.
- OTP send, wrong OTP, correct OTP, expired OTP (provider TTL 5 minutes).
- Register; logout; login; browser tab/session নতুন করে খুললে আবার OTP চায় কি না.
- ২০০ MB file upload; ২০০ MB-এর বেশি file client-side reject.
- QR generate/download; Copy link; My Files load; My Files entry remove (এটি metadata-only).
- Health check and each ad iframe.

### API contract assumptions

আগের source code অনুযায়ী upload request `POST /api/upload/file`, header `X-API-Key`, multipart `file` + `shorten=true`; successful JSON response-এ `success: true` এবং `url` / `short_url` / `direct_url` থাকতে হবে। Health endpoint `GET /health`। API response contract আলাদা হলে upload parser সংশোধন করতে হবে.
