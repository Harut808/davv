import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import express from "express";
import { console } from "inspector";
dotenv.config();
let app = express();
app.use(express.json());
if (!process.env.BOT_TOKEN) {
  console.error("Ошибка: BOT_TOKEN не найден в .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL_USERNAME = "@mskbonuss";
const ADMIN_ID = Number(process.env.ADMIN_ID);

// ===== ФАЙЛ С ПОЛЬЗОВАТЕЛЯМИ =====
const USERS_FILE = path.join(process.cwd(), "users.json");
bot.command("admin", async (ctx) => {
  const userId = ctx.from.id;

  // Проверка админа
  if (userId !== ADMIN_ID) {
    return ctx.reply("❌ У вас нет доступа к этой команде");
  }

  ctx.reply(
    "🛠 Админ-панель\n\n" +
    "Чтобы отправить сообщение всем пользователям, напиши:\n\n" +
    "/send ТЕКСТ_СООБЩЕНИЯ"
  );
});

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUser(userId) {
  const users = getUsers();
  if (!users.includes(userId)) {
    users.push(userId);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

// ===== ЛОКАЛЬНЫЕ ФОТО =====
const photoPath = path.join(process.cwd(), "foto", "photo.jpg");
const photoPath1 = path.join(process.cwd(), "foto", "photo1.jpg");

if (!fs.existsSync(photoPath) || !fs.existsSync(photoPath1)) {
  console.error("Одно или оба фото не найдены");
  process.exit(1);
}

// ===== ПРОВЕРКА ПОДПИСКИ =====
async function isSubscribed(userId) {
  try {
    console.log(userId) 
    const mmember= await bot.telegram.getChatMember(CHANNEL_USERNAME, userId);
    return ["creator", "administrator", "member"].includes(member.status);
  } catch {
    return false;
  }
}

// ===== /start =====
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  saveUser(userId);

  // уведомление админу
  try {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `👤 Пользователь ${ctx.from.username || ctx.from.first_name || userId
      } нажал /start`
    );
  } catch { }

  const caption = `Привет друг 👋  
В этом боте ты получишь бесплатные сигналы 🎯

💙 Зарегистрируйся на <a href="https://lkpq.cc/7f5c1e">сайте</a>  
🤍 Введи промокод <b>ABUZMSK</b>  
🍉 Подпишись на <a href="https://t.me/+MlguAZ5w20thY2Yy">канал</a>

👇 После этого нажми кнопку ниже`;

  await ctx.replyWithPhoto(
    { source: fs.createReadStream(photoPath) },
    {
      caption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Проверить подписку",
              callback_data: "check_subscription",
            },
          ],
        ],
      },
    }
  );
});

// ===== КНОПКА ПРОВЕРКИ =====
const secondCap = `Молодец вот твоя <a href="https://lkpq.cc/7f5c1e">ссылка</a> 
1)🤍Переходи по ней (регистрируйся) если нету аккаунта 
 2)💙 Вводи промокод  ABUZMSK после чего 
Пополняй свой баланс на 1500₽ 
3)❤️ Получай до 500% к первым депозитам 
4)Напиши свой username мне в личку @davxks 
5) приступай к заработку 

Все в твоих руках , абсолютно бесплатно 

Просьба, будь активным на канале💸

Благодарю`;

bot.action("check_subscription", async (ctx) => {
  const userId = ctx.from.id;
  const subscribed = await isSubscribed(userId);

  if (!subscribed) {
    const notSubscribedText = `
🚫 <b>Доступ ограничен</b>

Вы не подписаны на канал, поэтому сигналы недоступны 😔

🔔 Подписка обязательна:
<a href="https://t.me/+MlguAZ5w20thY2Yy">перейти в канал</a>

После подписки снова нажмите кнопку проверки ✅
`;

    await ctx.reply(notSubscribedText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Проверить подписку",
              callback_data: "check_subscription",
            },
          ],
        ],
      },
    });
  } else {
    await ctx.replyWithPhoto(
      { source: fs.createReadStream(photoPath1) },
      {
        caption: secondCap,
        parse_mode: "HTML",
      }
    );
  }
});

// ===== РАССЫЛКА ОТ АДМИНА =====
bot.on("text", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("❌ У тебя нет доступа");
  }

  const text = ctx.message.text.replace("/send", "").trim();
  if (!text) {
    return ctx.reply("❗ Используй:\n/send Текст сообщения");
  }

  const users = getUsers();
  let sent = 0;
  const secondText = "";
  for (const userId of users) {
    const subscribed = await isSubscribed(userId);
    if (!subscribed) {
      await bot.telegram.sendMessage(userId);
    }

    try {
      await bot.telegram.sendMessage(userId, text);
      sent++;
    } catch { }
  }

  ctx.reply(`✅ Рассылка завершена\n📨 Отправлено: ${sent}`);
});

// ===== ЗАПУСК =====
bot.launch();
console.log("Bot started 🚀");
app.get("/", (req, res) => {
  res.send("yey");
});
app.listen(3000);

