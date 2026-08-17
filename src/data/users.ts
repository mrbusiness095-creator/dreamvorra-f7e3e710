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

export const REGISTER_URL = "https://adsblog.app/page/reg.php?reg=MrBusiness";

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
  const templates = [
    `Habari yako, jina yangu ni ${name}. Mimi kupenda kujifunza Kiswahili kuhusu ${wants}. Wewe unaweza kunifundisha mimi?`,
    `Hodi hodi, mimi ni ${name}. Nataka kujua Kiswahili, hasa kuhusu ${wants}. Wewe unaweza kunisaidia?`,
    `Habari, mimi jina ${name}. Mimi kupenda kujua kuhusu ${wants} kwa Kiswahili. Unaweza kunifundisha?`,
  ];
  return templates[seedFromString(name + wants) % templates.length];
}