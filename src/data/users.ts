export type ForeignUser = {
  name: string;
  country: string;
  img: string;
  money: number;
  duration: number;
  rating: string;
  wants: string;
};

export const usersDatabase: ForeignUser[] = [
  { name: "Sophia", country: "US", img: "https://i.pravatar.cc/150?img=6", money: 52000, duration: 60, rating: "4.8", wants: "Practice Conversation & Music" },
  { name: "James", country: "GB", img: "https://i.pravatar.cc/150?img=1", money: 41500, duration: 45, rating: "4.9", wants: "Business Swahili & Culture" },
  { name: "Emma", country: "CA", img: "https://i.pravatar.cc/150?img=2", money: 30500, duration: 32, rating: "5.0", wants: "Teach Swahili Language (Hobbies)" },
  { name: "William", country: "AU", img: "https://i.pravatar.cc/150?img=3", money: 49500, duration: 55, rating: "4.8", wants: "Sports & Football Chat" },
  { name: "Olivia", country: "DE", img: "https://i.pravatar.cc/150?img=4", money: 36000, duration: 38, rating: "4.9", wants: "Learn Culture & Travel Tips" },
  { name: "Michael", country: "FR", img: "https://i.pravatar.cc/150?img=5", money: 45500, duration: 50, rating: "4.7", wants: "Music & Musical Instruments" },
  { name: "David", country: "IT", img: "https://i.pravatar.cc/150?img=7", money: 29000, duration: 30, rating: "4.9", wants: "Hiking & Mountain Climbing" },
  { name: "Charlotte", country: "ES", img: "https://i.pravatar.cc/150?img=8", money: 33500, duration: 35, rating: "5.0", wants: "Swahili Pronunciation Basics" },
  { name: "John", country: "NL", img: "https://i.pravatar.cc/150?img=9", money: 39000, duration: 42, rating: "4.6", wants: "Tech & Computing Terms" },
  { name: "Amelia", country: "SE", img: "https://i.pravatar.cc/150?img=10", money: 50500, duration: 58, rating: "4.9", wants: "African Food Recipes Discussion" },
  { name: "Robert", country: "NO", img: "https://i.pravatar.cc/150?img=11", money: 37500, duration: 40, rating: "4.7", wants: "Cars & Transport Conversation" },
  { name: "Ava", country: "CH", img: "https://i.pravatar.cc/150?img=12", money: 31500, duration: 33, rating: "4.7", wants: "Friendly Daily Chat" },
  { name: "Daniel", country: "JP", img: "https://i.pravatar.cc/150?img=13", money: 47500, duration: 52, rating: "5.0", wants: "Photography & Wildlife" },
  { name: "Isabella", country: "KR", img: "https://i.pravatar.cc/150?img=14", money: 43500, duration: 47, rating: "4.9", wants: "Fitness & Lifestyle Chat" },
  { name: "Christopher", country: "BR", img: "https://i.pravatar.cc/150?img=15", money: 48500, duration: 56, rating: "4.8", wants: "Engineering & Construction" },
  { name: "Mia", country: "PT", img: "https://i.pravatar.cc/150?img=16", money: 30000, duration: 31, rating: "4.8", wants: "Nature & Environment" },
  { name: "Andrew", country: "BE", img: "https://i.pravatar.cc/150?img=17", money: 34500, duration: 36, rating: "4.9", wants: "Islands & Ocean Life" },
  { name: "Evelyn", country: "IE", img: "https://i.pravatar.cc/150?img=18", money: 49000, duration: 54, rating: "5.0", wants: "Photography & Swahili" },
  { name: "Joseph", country: "NZ", img: "https://i.pravatar.cc/150?img=19", money: 40500, duration: 44, rating: "4.7", wants: "Farming & Agriculture" },
  { name: "Harper", country: "DK", img: "https://i.pravatar.cc/150?img=20", money: 32500, duration: 34, rating: "4.6", wants: "Casual Audio & Chat Practice" },
  { name: "Matthew", country: "AT", img: "https://i.pravatar.cc/150?img=21", money: 37000, duration: 39, rating: "4.8", wants: "Swimming & Water Sports" },
  { name: "Abigail", country: "US", img: "https://i.pravatar.cc/150?img=22", money: 52000, duration: 59, rating: "5.0", wants: "Business Swahili Greetings" },
  { name: "Anthony", country: "FI", img: "https://i.pravatar.cc/150?img=23", money: 44500, duration: 48, rating: "4.9", wants: "Aviation & Flying Stories" },
  { name: "Emily", country: "GB", img: "https://i.pravatar.cc/150?img=24", money: 35500, duration: 37, rating: "4.8", wants: "Vacation & Beach Chat" },
  { name: "Joshua", country: "PL", img: "https://i.pravatar.cc/150?img=25", money: 29000, duration: 30, rating: "4.7", wants: "Reading & Books in Swahili" },
  { name: "Elizabeth", country: "GR", img: "https://i.pravatar.cc/150?img=26", money: 42500, duration: 46, rating: "4.9", wants: "Swahili History & Stories" },
  { name: "Benjamin", country: "CA", img: "https://i.pravatar.cc/150?img=27", money: 50500, duration: 57, rating: "5.0", wants: "Finance & Economy Chat" },
  { name: "Victoria", country: "DE", img: "https://i.pravatar.cc/150?img=28", money: 38000, duration: 41, rating: "4.7", wants: "Polite Swahili Phrases" },
  { name: "Nicholas", country: "US", img: "https://i.pravatar.cc/150?img=29", money: 33500, duration: 35, rating: "4.8", wants: "Camping in National Parks" },
  { name: "Grace", country: "NL", img: "https://i.pravatar.cc/150?img=30", money: 31500, duration: 33, rating: "5.0", wants: "Gardening & Family Chat" },
  { name: "Alexander", country: "AE", img: "https://i.pravatar.cc/150?img=31", money: 52000, duration: 60, rating: "4.9", wants: "Languages & World Cultures" },
  { name: "Hannah", country: "SE", img: "https://i.pravatar.cc/150?img=32", money: 29000, duration: 30, rating: "4.6", wants: "Art & Colors in Swahili" },
  { name: "Ryan", country: "AU", img: "https://i.pravatar.cc/150?img=33", money: 39500, duration: 43, rating: "4.8", wants: "Gaming & Online Fun" },
  { name: "Chloe", country: "FR", img: "https://i.pravatar.cc/150?img=34", money: 46500, duration: 51, rating: "4.9", wants: "Fashion & Cultural Clothes" },
  { name: "Jonathan", country: "NO", img: "https://i.pravatar.cc/150?img=35", money: 48000, duration: 53, rating: "4.9", wants: "Documentaries & Nature Films" },
  { name: "Lily", country: "IT", img: "https://i.pravatar.cc/150?img=36", money: 31000, duration: 32, rating: "4.8", wants: "Pets & Animal Names" },
  { name: "Samuel", country: "ZA", img: "https://i.pravatar.cc/150?img=37", money: 45000, duration: 49, rating: "4.8", wants: "Geology & Earth Science" },
  { name: "Scarlett", country: "ES", img: "https://i.pravatar.cc/150?img=38", money: 50000, duration: 55, rating: "5.0", wants: "Movies & Entertainment" },
  { name: "Ethan", country: "PT", img: "https://i.pravatar.cc/150?img=39", money: 36500, duration: 38, rating: "4.7", wants: "Surfing & Water Adventure" },
];


export function findUser(name: string) {
  return usersDatabase.find((u) => u.name.toLowerCase() === name.toLowerCase());
}

function seedFromString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function firstMessageBroken(name: string, wants: string) {
  const openings = [
    `Hi! I’m ${name} 😊 I’m here to learn more about Tanzania. I saw you’re into ${wants.toLowerCase()}.`,
    `Hello! I’m ${name}. Nice to meet you! 😊 I’m especially curious about Tanzania and ${wants.toLowerCase()}.`,
    `Hey there 👋 I’m ${name}. I’ve been wanting to learn more about Tanzania. What part of ${wants.toLowerCase()} do you enjoy most?`,
  ];
  return openings[Math.floor(Math.random() * openings.length)];
}

function cleanSwahili(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateForeignerReply(input: string, name: string, wants: string) {
  const t = cleanSwahili(input);
  const has = (...phrases: string[]) => phrases.some((p) => t === p || t.includes(p));

  if (has("habari", "mambo", "hujambo", "shikamoo")) {
    return pick([
      "Niko vizuri sana, asante 😊 Wewe ukoje leo?",
      "Hey! I’m good, thank you 😊 Leo yako imekuwaje?",
      "Salama kabisa! Nimefurahi kukuona hapa. Umefanya nini leo?",
    ]);
  }
  if (has("ukoje", "unaendeleaje", "hali yako")) {
    return pick([
      "Niko vizuri 😊 Leo nimekuwa busy kidogo, lakini sasa nimepata muda wa kuongea.",
      "I’m doing well, thanks! Na wewe siku yako imeendaje?",
      "Niko poa kabisa. 😊 Kuna kitu kizuri kimetokea kwako leo?",
    ]);
  }
  if (has("karibu", "welcome")) {
    return pick([
      "Asante! 😊 Tanzania imenivutia sana. Nimekuwa nikisikia mambo mengi mazuri kuhusu utamaduni wenu.",
      "Thank you! 😄 I’m happy to be here. What should a first-time visitor know about Tanzania?",
      "Asante sana! Nimefurahi kuzungumza na wewe. Ungependekeza nianzie wapi kujifunza zaidi kuhusu Tanzania?",
    ]);
  }
  if (has("unatoka wapi", "wapi unatoka", "nchi gani")) {
    return pick([
      "I’m from Europe, but I travel quite a bit. Tanzania has been on my list for a while. 😊",
      "Ninatoka nje ya Tanzania 😊 Kwa sasa niko mbali kidogo, lakini napenda kujifunza kuhusu nchi tofauti.",
      "I’m not in Tanzania at the moment. I’d love to visit though. Which place would you recommend first?",
    ]);
  }
  if (has("unaishi wapi", "unaishi nchi")) {
    return pick([
      "I live outside Tanzania. My time zone is a little different, but I don’t mind staying up for a good conversation 😄.",
      "Ninaishi nje ya Tanzania, ndiyo maana wakati mwingine unaweza kuona muda wangu ni tofauti kidogo. 😊",
      "I’m based abroad for work. Have you always lived in Tanzania?",
    ]);
  }
  if (has("jina lako", "unaitwa nani")) {
    return pick([
      `Naitwa ${name} 😊 Na wewe unaitwa nani?`,
      `I’m ${name}. Nice to meet you properly! What should I call you?`,
      `${name} 😊 You can call me that. Na wewe jina lako nani?`,
    ]);
  }
  if (has("unapenda nini", "unapenda kufanya nini")) {
    return pick([
      `I’m really into ${wants.toLowerCase()}, travel and music. What about you?`,
      `Napenda ${wants.toLowerCase()}, lakini pia napenda kusafiri na kusikiliza muziki. Wewe je?`,
      `A lot of things 😄 Especially ${wants.toLowerCase()}. Kuna hobby yako ambayo watu wengi hawajui?`,
    ]);
  }
  if (has("umekula", "ume kula", "chakula", "food")) {
    return pick([
      "Not yet 😄 I’m actually curious about Tanzanian food. Ungependekeza nile nini kwanza?",
      "Nimekula kidogo tu. 😊 Wewe leo umekula nini?",
      "I love trying local food when I travel. What Tanzanian dish would you give me?",
    ]);
  }
  if (has("asante", "ahsante", "shukrani")) {
    return pick([
      "Karibu sana 😊 Na mimi nashukuru kwa kunifundisha Kiswahili.",
      "You’re welcome! 😄 By the way, is my Swahili getting better?",
      "Karibu! 😊 I’m enjoying this conversation too.",
    ]);
  }
  if (has("pole", "samahani")) {
    return pick([
      "Asante kwa kujali 😊 Niko sawa kabisa.",
      "It’s okay, no worries 😊 Tuendelee tu na story yetu.",
      "Asante sana. I appreciate that. ❤️",
    ]);
  }
  if (has("nakupenda", "ninakupenda", "love you", "i love you")) {
    return pick([
      "Aww 😄 You’re very sweet. I’m enjoying talking with you too.",
      "Hahaha ❤️ umeanza mapema! Lakini nimefurahi kusikia hivyo.",
      "That’s cute 😊 Tuendelee kwanza kujuana vizuri.",
    ]);
  }
  if (has("furaha", "nimefurahi")) {
    return pick([
      "Nimefurahi pia 😊 Ni vizuri sana kupata conversation yenye positive energy.",
      "That makes me happy too! What has made you smile today?",
      "😊 Mimi pia. Kuna vibe nzuri hapa.",
    ]);
  }
  if (has("usiku mwema", "lala salama")) {
    return pick([
      "Usiku mwema 😊 Lala salama, tutaendelea na story yetu baadaye.",
      "Good night! 🌙 I really enjoyed chatting with you today.",
      "Lala salama 😊 Na usisahau kunifundisha Kiswahili zaidi kesho.",
    ]);
  }
  if (has("habari za asubuhi", "asubuhi njema")) {
    return pick([
      "Asubuhi njema! ☀️ Umeamkaje?",
      "Good morning 😊 I hope you slept well. Una mpango gani leo?",
      "Asubuhi njema! Leo nataka nijifunze neno jipya la Kiswahili kutoka kwako 😄.",
    ]);
  }
  if (has("bye", "kwaheri", "tutaonana", "baadaye")) {
    return pick([
      "Kwaheri! 👋 Nimefurahia story yetu. Tutaongea tena.",
      "Bye 😊 Take care, and don’t forget our conversation!",
      "Tutaonana baadaye 👋 Nitakuwa nategemea story nyingine kutoka kwako.",
    ]);
  }
  if (has("unaelewa kiswahili", "unaweza kiswahili", "unajua kiswahili")) {
    return pick([
      "I understand some Swahili, but I’m still learning 😄. Ukikuta nimekosea, nirekebishe.",
      "Ndiyo, naelewa kidogo 😊 Lakini bado najifunza. Ungeweza kunifundisha sentensi moja mpya?",
      "A little! 😄 That’s actually why I enjoy these chats. Please correct me when I make mistakes.",
    ]);
  }
  if (has("rafiki", "tufanye marafiki")) {
    return pick([
      "Of course 😊 Ningependa tuwe marafiki. Tell me something interesting about you.",
      "Ndiyo kabisa 😄 Tuanzie hapo—unapenda kufanya nini ukiwa free?",
      "I’d like that 😊 I think we already have a nice conversation going.",
    ]);
  }
  if (/^(ndio|ndiyo|hapana|sawa|ok|okay|poa|vizuri|freshi|naam)$/.test(t)) {
    return pick([
      "Sawa 😊 Sasa niambie zaidi—unafikiria nini kuhusu hilo?",
      "Okay! 😄 Nimekupata. Na kwako imekuwaje?",
      t === "hapana" ? "Sawa, nimekuelewa 😊 Kwa hiyo ungependa tufanye nini badala yake?" : "Poa kabisa 😊 Endelea, ninasikiliza.",
    ]);
  }

  const contextual = [
    `That’s interesting 😊 Especially because I’m trying to learn about ${wants.toLowerCase()}. How is it for you?`,
    `Nimekupata 😊 Mimi ningependa kujua zaidi. Hilo limekuaje kwako?`,
    `Really? 😄 Tell me a little more. I want to understand your side of it.`,
    `Aah, sasa nimeelewa. 😊 What do you usually do when that happens?`,
    `Hiyo ni interesting sana. Ungeweza kunipa mfano mmoja?`,
    `I like the way you explained that. 😊 What made you interested in it?`,
    `Hmm, nimewahi kusikia kuhusu hilo kidogo. Wewe una experience gani nalo?`,
    `That sounds nice. 😄 If I visited Tanzania, would you show me something related to that?`,
  ];
  return pick(contextual);
}

