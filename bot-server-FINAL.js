/**
 * ══════════════════════════════════════════════════════════════
 *  ELSA DIGITAL HQ — COMPLETE MASTER SERVER
 *  Single file. Run: node server.js
 *  Handles: Telegram Bot + Portfolio API + Contact Form
 * ══════════════════════════════════════════════════════════════
 */

require('dotenv').config();

const express     = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors        = require('cors');
const fs          = require('fs');
const path        = require('path');
const https       = require('https');

/* ══════════════════════════════════════════════════════════════
   CONFIG  (falls back to hardcoded values if .env missing)
══════════════════════════════════════════════════════════════ */
const TOKEN       = process.env.TELEGRAM_BOT_TOKEN || '8286143420:AAGT8WAQCrRT60skqtjxL8d66ZUT6K9SdBg';
const OWNER_ID    = parseInt(process.env.ALLOWED_USER_IDS || '7663311859');
const ALLOWED_IDS = [OWNER_ID];
const PORT        = parseInt(process.env.PORT || '3000');
const DATA_DIR    = path.join(__dirname, 'data');
const DATA_FILE   = path.join(DATA_DIR, 'store.json');
const DEFAULT_ADDR= process.env.DEFAULT_ADDRESS || 'Yangon, Myanmar 🇲🇲';

/* ══════════════════════════════════════════════════════════════
   DATA STORE  (flat JSON file — simple and reliable)
══════════════════════════════════════════════════════════════ */
function loadStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { address: DEFAULT_ADDR, coordinates: null, addressUpdatedAt: null, articles: [] }; }
}
function saveStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ══════════════════════════════════════════════════════════════
   TELEGRAM BOT
══════════════════════════════════════════════════════════════ */
const bot = new TelegramBot(TOKEN, { polling: true });

const isAllowed = msg => ALLOWED_IDS.includes(msg.from?.id);
const deny      = id  => bot.sendMessage(id, '🚫 Unauthorized.');

function uid()         { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function fmtDate(ts)   { return new Date(ts).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

/* Download Telegram photo → base64 data URL */
async function photoToDataURL(fileId) {
  try {
    const info = await bot.getFile(fileId);
    const url  = `https://api.telegram.org/file/bot${TOKEN}/${info.file_path}`;
    return new Promise((res, rej) => {
      https.get(url, r => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end',  () => res('data:image/jpeg;base64,' + Buffer.concat(chunks).toString('base64')));
        r.on('error', rej);
      });
    });
  } catch(e) { console.error('[Photo]', e.message); return null; }
}

/* Reverse geocode lat/lng → human address */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    return new Promise((res, rej) => {
      https.get(url, { headers:{ 'User-Agent':'ElsaDigitalHQ/1.0' } }, r => {
        let body = '';
        r.on('data', c => body += c);
        r.on('end', () => {
          const d = JSON.parse(body);
          const a = d.address || {};
          const parts = [a.suburb||a.neighbourhood||a.village, a.city||a.town||a.county, a.country].filter(Boolean);
          res(parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        });
        r.on('error', rej);
      });
    });
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}

/* ── /start · /help ── */
bot.onText(/\/(start|help)/, msg => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(msg.chat.id, `
✦ *Elsa Digital HQ Bot* — Ready ✦

*📍 Address:*
\`/updateaddress Lashio, Shan State\`
Send a 📍 Location pin → auto-geocodes

*📰 Articles:*
📸 Photo + caption → image article
📝 Text message → text article
\`/deletearticle <id>\` → remove article

*🔧 Other:*
\`/clearaddress\` → reset to default
\`/status\` → current data
\`/help\` → this menu

Your portfolio updates within 30 seconds. 🌸
  `.trim(), { parse_mode:'Markdown' });
});

/* ── /status ── */
bot.onText(/\/status/, msg => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const s = loadStore();
  bot.sendMessage(msg.chat.id,
    `📊 *Status*\n\n📍 *Address:* ${s.address}\n📰 *Articles:* ${s.articles.length}\n🕐 *Now:* ${fmtDate(Date.now())}`,
    { parse_mode:'Markdown' }
  );
});

/* ── /updateaddress ── */
bot.onText(/\/updateaddress (.+)/, (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const addr = match[1].trim();
  const s = loadStore();
  s.address = addr; s.coordinates = null; s.addressUpdatedAt = Date.now();
  saveStore(s);
  bot.sendMessage(msg.chat.id, `✅ *Address updated!*\n\n📍 _${addr}_\n\nPortfolio updates in ~30 seconds.`, { parse_mode:'Markdown' });
  console.log(`[ADDR] → ${addr}`);
});

/* ── /clearaddress ── */
bot.onText(/\/clearaddress/, msg => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const s = loadStore();
  s.address = DEFAULT_ADDR; s.coordinates = null; s.addressUpdatedAt = Date.now();
  saveStore(s);
  bot.sendMessage(msg.chat.id, `✅ Reset to: _${DEFAULT_ADDR}_`, { parse_mode:'Markdown' });
});

/* ── /deletearticle ── */
bot.onText(/\/deletearticle (.+)/, (msg, match) => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const id = match[1].trim();
  const s  = loadStore();
  const before = s.articles.length;
  s.articles = s.articles.filter(a => a.id !== id);
  saveStore(s);
  bot.sendMessage(msg.chat.id,
    s.articles.length < before
      ? `🗑️ Article \`${id}\` deleted.`
      : `⚠️ No article with ID \`${id}\``,
    { parse_mode:'Markdown' }
  );
});

/* ── 📍 LOCATION PIN ── */
bot.on('location', async msg => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const { latitude: lat, longitude: lng } = msg.location;
  bot.sendMessage(msg.chat.id, '⏳ Geocoding your location…');
  const addr = await reverseGeocode(lat, lng);
  const s = loadStore();
  s.address = addr; s.coordinates = { lat, lng }; s.addressUpdatedAt = Date.now();
  saveStore(s);
  bot.sendMessage(msg.chat.id,
    `✅ *Location updated!*\n\n📍 _${addr}_\n🗺️ \`${lat.toFixed(5)}, ${lng.toFixed(5)}\``,
    { parse_mode:'Markdown' }
  );
  console.log(`[LOC] ${addr} (${lat}, ${lng})`);
});

/* ── 📸 PHOTO → Article ── */
bot.on('photo', async msg => {
  if (!isAllowed(msg)) return deny(msg.chat.id);
  bot.sendMessage(msg.chat.id, '⏳ Publishing article…');
  const photo   = msg.photo[msg.photo.length - 1];
  const caption = msg.caption || '';
  const lines   = caption.split('\n').filter(Boolean);
  const title   = lines[0] || 'Daily Article';
  const body    = lines.slice(1).join('\n').trim();
  const imgData = await photoToDataURL(photo.file_id);
  const article = { id:uid(), type:'photo', title, body, imageData:imgData, publishedAt:Date.now(), formattedDate:fmtDate(Date.now()) };
  const s = loadStore();
  s.articles.unshift(article);
  if (s.articles.length > 20) s.articles = s.articles.slice(0,20);
  saveStore(s);
  bot.sendMessage(msg.chat.id,
    `✅ *Article published!*\n\n📰 _${title}_\n🆔 \`${article.id}\`\n\nTo delete: \`/deletearticle ${article.id}\``,
    { parse_mode:'Markdown' }
  );
  console.log(`[ART] Photo: "${title}" (${article.id})`);
});

/* ── 📝 TEXT → Article ── */
bot.on('message', msg => {
  if (msg.photo || msg.location || msg.entities?.some(e=>e.type==='bot_command')) return;
  if (!msg.text || msg.text.startsWith('/')) return;
  if (!isAllowed(msg)) return deny(msg.chat.id);
  const lines  = msg.text.split('\n').filter(Boolean);
  const title  = lines[0]; if (!title) return;
  const body   = lines.slice(1).join('\n').trim();
  const article = { id:uid(), type:'text', title, body, imageData:null, publishedAt:Date.now(), formattedDate:fmtDate(Date.now()) };
  const s = loadStore();
  s.articles.unshift(article);
  if (s.articles.length > 20) s.articles = s.articles.slice(0,20);
  saveStore(s);
  bot.sendMessage(msg.chat.id,
    `✅ *Text article published!*\n\n📝 _${title}_\n🆔 \`${article.id}\`\n\nTo delete: \`/deletearticle ${article.id}\``,
    { parse_mode:'Markdown' }
  );
  console.log(`[ART] Text: "${title}" (${article.id})`);
});

/* ══════════════════════════════════════════════════════════════
   EXPRESS API
══════════════════════════════════════════════════════════════ */
const app = express();
app.use(cors());
app.use(express.json({ limit:'10mb' }));

/* Portfolio feed — polled every 30s by the HTML */
app.get('/api/feed', (_, res) => res.json(loadStore()));

/* Contact form → Telegram DM to Elsa */
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error:'Missing fields' });
  const text = `📬 *New Portfolio Enquiry*\n\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📌 *Subject:* ${subject||'General'}\n\n💬 *Message:*\n${message}\n\n🕐 ${fmtDate(Date.now())}`;
  try {
    await bot.sendMessage(OWNER_ID, text, { parse_mode:'Markdown' });
    res.json({ ok:true });
    console.log(`[CONTACT] From: ${name} <${email}>`);
  } catch(e) {
    console.error('[CONTACT]', e.message);
    res.status(500).json({ error:e.message });
  }
});

/* Health check */
app.get('/health', (_, res) => {
  const s = loadStore();
  res.json({ ok:true, articles:s.articles.length, address:s.address });
});

/* ══════════════════════════════════════════════════════════════
   START
══════════════════════════════════════════════════════════════ */
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✦ ═══════════════════════════════════════════ ✦');
  console.log('  ELSA DIGITAL HQ — Server Running');
  console.log('✦ ═══════════════════════════════════════════ ✦');
  console.log(`  → API:      http://localhost:${PORT}/api/feed`);
  console.log(`  → Network:  http://<your-ip>:${PORT}/api/feed`);
  console.log(`  → Health:   http://localhost:${PORT}/health`);
  console.log(`  → Bot ID:   ${OWNER_ID}`);
  console.log('  → Telegram: polling active\n');
  // Send startup notification to Elsa
  bot.sendMessage(OWNER_ID,
    `✦ *Elsa Digital HQ is Online* ✦\n\n🟢 Server started at ${fmtDate(Date.now())}\n📡 API running on port ${PORT}\n\nSend /help to see all commands.`,
    { parse_mode:'Markdown' }
  ).catch(() => {});
});
