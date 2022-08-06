import { Telegraf, Markup } from 'telegraf'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync } from 'fs';

const token = process.env.BOT_TOKEN
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const secret = process.env.JWT_SECRET;
if (secret === undefined) {
  throw new Error('JWT_SECRET must be provided!')
}

const keyboard = Markup.inlineKeyboard([
  Markup.button.url('Desktop App', 'http://chainspider.net'),
  Markup.button.callback('Request Key', 'getkey'),
  Markup.button.callback('Report Scam', 'reportscam')
])

function getKey(id) {
  let keys = JSON.parse(readFileSync('keys.json','utf-8'));
  return keys[id];
}

function saveKey(id, key) {
  let keys = JSON.parse(readFileSync('keys.json','utf-8'));
  keys[id] = key;
  writeFileSync('keys.json', JSON.stringify(keys));
}

function generateKey(tg, expiresIn) {
  const token = {
    'jti': uuidv4(),
    'tg': tg
  };
  return jwt.sign(token, secret, { expiresIn });
}

const bot = new Telegraf(token)
bot.start((ctx) => ctx.reply('Welcome to ChainSpider! Please select an option:', keyboard))
bot.action('getkey', (ctx) => {

  const tg = ctx.from.username;
  const expiresIn = '7d';
  
  if (getKey(tg) != undefined) {
    ctx.replyWithMarkdown("Sorry "+tg+", you have already requested a beta key.  Please contact an administrator if you've lost it or are otherwise having trouble.");
  } else {
    const key = generateKey(tg, expiresIn);
    saveKey(tg, key);
    ctx.replyWithMarkdown("Thanks "+tg+", your beta key is valid for "+expiresIn+" click to copy: `"+key+"`");
  }
  
})
bot.action('reportscam', (ctx) => ctx.replyWithMarkdown("Sorry, not yet implemented"))
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
