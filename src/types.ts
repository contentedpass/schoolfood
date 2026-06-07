export interface School {
  schoolCode: string;
  officeCode: string;
  schoolName: string;
  officeName: string;
  address: string;
  location: string;
}

export interface Dish {
  raw: string;
  clean: string;
  allergyCode: string | null;
}

export interface Meal {
  mealCode: string; // 1: 조식, 2: 중식, 3: 석식
  mealName: string; // 조식, 중식, 석식
  calories: string;
  origins: string[];
  nutrition: string[];
  dishes: Dish[];
}

export const ALLERGY_MAP: { [key: string]: string } = {
  "1": "난류 (계란 등)",
  "2": "우유",
  "3": "메밀",
  "4": "땅콩",
  "5": "대두 (콩)",
  "6": "밀",
  "7": "고등어",
  "8": "게",
  "9": "새우",
  "10": "돼지고기",
  "11": "복숭아",
  "12": "토마토",
  "13": "아황산류 (산화방지제 등)",
  "14": "호두",
  "15": "닭고기",
  "16": "쇠고기",
  "17": "오징어",
  "18": "조개류 (굴, 전복, 홍합 등)",
  "19": "잣",
};

export const ALLERGY_ICONS: { [key: string]: string } = {
  "1": "🥚",
  "2": "🥛",
  "3": "🌾",
  "4": "🥜",
  "5": "🫘",
  "6": "🍞",
  "7": "🐟",
  "8": "🦀",
  "9": "🦐",
  "10": "🐷",
  "11": "🍑",
  "12": "🍅",
  "13": "🧪",
  "14": "🌰",
  "15": "🍗",
  "16": "🥩",
  "17": "🦑",
  "18": "🦪",
  "19": "🌲",
};
