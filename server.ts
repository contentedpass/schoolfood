import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * 1. School Search API
 * Endpoint: GET /api/schools?keyword=<keyword>
 */
app.get("/api/schools", async (req, res) => {
  try {
    const keyword = req.query.keyword as string;
    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({ error: "검색어는 최소 2글자 이상 입력해주세요." });
    }

    const neisKey = process.env.NEIS_API_KEY;
    const url = new URL("https://open.neis.go.kr/hub/schoolInfo");
    url.searchParams.append("Type", "json");
    url.searchParams.append("pIndex", "1");
    url.searchParams.append("pSize", "40");
    url.searchParams.append("SCHUL_NM", keyword.trim());
    if (neisKey && neisKey !== "MY_NEIS_API_KEY") {
      url.searchParams.append("KEY", neisKey);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`나이스 API 호출 실패: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    // Check if schoolInfo is present in the response
    if (!data.schoolInfo) {
      // It might return RESULT indicating no data or error
      if (data.RESULT) {
        return res.json({ schools: [], message: data.RESULT.MESSAGE });
      }
      return res.json({ schools: [] });
    }

    const rows = data.schoolInfo[1]?.row || [];
    const schools = rows.map((row: any) => ({
      schoolCode: row.SD_SCHUL_CODE,
      officeCode: row.ATPT_OFCDC_SC_CODE,
      schoolName: row.SCHUL_NM,
      officeName: row.ATPT_OFCDC_SC_NM,
      address: row.ORG_RDNMA || "주소 없음",
      location: row.LCTN_SC_NM || "미지정",
    }));

    res.json({ schools });
  } catch (error: any) {
    console.error("학교 검색 에러:", error);
    res.status(500).json({ error: error.message || "학교 정보를 검색하는 도중 에러가 발생했습니다." });
  }
});

/**
 * Helper function to strip allergy codes from dish name
 * Example: "치즈돈가스 (1.2.5.6.10)" -> "치즈돈가스"
 * Or: "우동* (1.5.6.9.13.18)" -> "우동" / "우동*"
 */
function cleanDishName(dish: string): string {
  // Remove trailing asterisk often found in NEIS meals
  let clean = dish.replace(/\s*\*+$/, "");
  // Remove numbers in parenthesis representing allergen markers
  clean = clean.replace(/\s*\([a-zA-Z0-9.\s,·]+\)/g, "");
  return clean.trim();
}

/**
 * 2. School Meal Lookup API
 * Endpoint: GET /api/meal?schoolCode=<schoolCode>&officeCode=<officeCode>&date=<YYYYMMDD>
 */
app.get("/api/meal", async (req, res) => {
  try {
    const { schoolCode, officeCode, date } = req.query;
    if (!schoolCode || !officeCode || !date) {
      return res.status(400).json({ error: "학교 코드, 교육청 코드 및 날짜(YYYYMMDD)가 필요합니다." });
    }

    const neisKey = process.env.NEIS_API_KEY;
    const url = new URL("https://open.neis.go.kr/hub/mealServiceDietInfo");
    url.searchParams.append("Type", "json");
    url.searchParams.append("ATPT_OFCDC_SC_CODE", officeCode as string);
    url.searchParams.append("SD_SCHUL_CODE", schoolCode as string);
    url.searchParams.append("MLSV_YMD", date as string);
    if (neisKey && neisKey !== "MY_NEIS_API_KEY") {
      url.searchParams.append("KEY", neisKey);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`나이스 급식 API 호출 실패: ${response.statusText}`);
    }

    const data: any = await response.json();

    if (!data.mealServiceDietInfo) {
      if (data.RESULT) {
        return res.json({ meals: [], message: data.RESULT.MESSAGE });
      }
      return res.json({ meals: [] });
    }

    const rows = data.mealServiceDietInfo[1]?.row || [];
    const meals = rows.map((row: any) => {
      // Split raw dish name string by <br/> to get list
      const rawDishes = row.DDISH_NM ? row.DDISH_NM.split(/<br\s*\/?>/i) : [];
      const structuredDishes = rawDishes.map((dishStr: string) => {
        const clean = cleanDishName(dishStr);
        // Extract what was inside parenthesis if any (which represents allergy identifiers)
        const allergyMatch = dishStr.match(/\(([^)]+)\)/);
        const allergyCode = allergyMatch ? allergyMatch[1] : null;
        return {
          raw: dishStr,
          clean: clean,
          allergyCode: allergyCode,
        };
      });

      return {
        mealCode: row.MMEAL_SC_CODE, // 1: 조식, 2: 중식, 3: 석식
        mealName: row.MMEAL_SC_NM,   // 조식, 중식, 석식
        calories: row.CAL_INFO || "칼로리 정보 없음",
        origins: row.ORPLC_INFO ? row.ORPLC_INFO.split(/<br\s*\/?>/i).filter(Boolean) : [],
        nutrition: row.NTR_INFO ? row.NTR_INFO.split(/<br\s*\/?>/i).filter(Boolean) : [],
        dishes: structuredDishes,
      };
    });

    res.json({ meals });
  } catch (error: any) {
    console.error("급식 조회 에러:", error);
    res.status(500).json({ error: error.message || "급식 데이터를 불러오는 도중 에러가 발생했습니다." });
  }
});

/**
 * 3. Gemini Commentary API
 * Endpoint: POST /api/commentary
 * Body: { schoolName, mealName, menuList: string[] }
 */
app.post("/api/commentary", async (req, res) => {
  try {
    const { schoolName, mealName, menuList } = req.body;
    if (!menuList || !Array.isArray(menuList) || menuList.length === 0) {
      return res.status(400).json({ error: "한줄평을 작성할 급식 메뉴 리스트를 제공해주세요." });
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "Gemini API 클라이언트가 초기화되지 않았습니다. Settings > Secrets 패널에서 GEMINI_API_KEY를 등록해주세요." 
      });
    }

    const dishesStr = menuList.join(", ");
    const parsedSchoolName = schoolName || "학교";
    const parsedMealName = mealName || "중식";

    const prompt = `당신은 재치 넘치고 유머 감각 있는 급식 평가 평론가입니다.
우리가 제공하는 학교 급식 메뉴를 바탕으로 학생들에게 딱 맞는 재미있고 신선한 한국어 "급식 한줄평"을 지어주세요.

[작성 가이드라인]
1. 드립이나 인터넷 밈을 적재적소에 섞어주세요.
2. 초·중·고등학생들의 급식 시간 설렘과 고찰을 재미있게 자아내도록 유도해 주세요.
3. 이모지(Emoji)를 1~2개 감칠맛 나게 섞어주세요.
4. 부연설명, 인사말, 인용구(" " 또는 ' ')는 절대 적지 말고, 오직 한줄평 본문만 출력하세요. (1~2줄의 문장 형태)

[급식 정보]
- 학교: ${parsedSchoolName}
- 시간: ${parsedMealName}
- 메뉴 구성: ${dishesStr}

[출력 예시]
"삼겹살 구이에 비빔막국수조합이라니, 오늘 급식 당번 손맛에 무릎을 탁 칩니다! 5교시 체육시간까지 도파민 풀충전 완료! ⚡️"
"카레라이스에 해쉬브라운 조합은 못 참지! 식판 빵꾸날 정도로 싹싹 안 긁으면 스파이인 거 아시죠? 😋"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const commentary = response.text?.trim() || "오늘 급식도 맛있게 먹고 건강하게 자라나요! 🌱";

    res.json({ commentary });
  } catch (error: any) {
    console.error("Gemini 에러 발생:", error);
    res.status(500).json({ error: error.message || "Gemini 한줄평을 생성하는 도중 에러가 발생했습니다." });
  }
});

// Configure Vite or Static files depending on Environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
