import React, { useState } from "react";
import { 
  Sparkles, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Copy, 
  Check, 
  Info,
  Apple
} from "lucide-react";
import { Meal, ALLERGY_MAP, ALLERGY_ICONS, Dish } from "../types";

interface MealCardProps {
  key?: string | number;
  meal: Meal;
  schoolName: string;
  myAllergies: string[];
  commentaryLoading: boolean;
  commentary: string | null;
  onGenerateCommentary: (meal: Meal) => void;
}

export default function MealCard({
  meal,
  schoolName,
  myAllergies,
  commentaryLoading,
  commentary,
  onGenerateCommentary,
}: MealCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Helper to determine the emoji according to meal type with solid neo-brutalist colors
  const getMealHeader = (code: string, name: string) => {
    switch (code) {
      case "1":
        return { emoji: "🌅", bg: "bg-amber-300 text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]", label: name || "조식" };
      case "2":
        return { emoji: "☀️", bg: "bg-[#22c55e] text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]", label: name || "중식" };
      case "3":
        return { emoji: "🌙", bg: "bg-indigo-300 text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]", label: name || "석식" };
      default:
        return { emoji: "🍱", bg: "bg-sky-300 text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]", label: name || "급식" };
    }
  };

  const header = getMealHeader(meal.mealCode, meal.mealName);

  // Check if this dish contains any allergy the user was flagged for
  const checkAllergyWarning = (dish: Dish): boolean => {
    if (!dish.allergyCode) return false;
    const codes = dish.allergyCode.split(".");
    return codes.some(code => myAllergies.includes(code.trim()));
  };

  // Get active allergies for a specific dish
  const getDishActiveAllergies = (dish: Dish): string[] => {
    if (!dish.allergyCode) return [];
    const codes = dish.allergyCode.split(".");
    return codes
      .map(c => c.trim())
      .filter(c => myAllergies.includes(c));
  };

  // Check if this meal as a whole triggers any user allergies
  const totalAllergyWarningsInMeal = meal.dishes.filter(checkAllergyWarning).length;

  const handleCopy = () => {
    if (!commentary) return;
    navigator.clipboard.writeText(commentary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      id={`meal-card-${meal.mealCode}`}
      className={`border-4 border-slate-950 rounded-[2.5rem] bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden transition-all duration-300 ${
        totalAllergyWarningsInMeal > 0 
          ? "ring-4 ring-rose-500/30" 
          : ""
      }`}
    >
      {/* Card Header Banner & Title */}
      <div className="p-5 border-b-4 border-slate-950 flex items-center justify-between flex-wrap gap-3 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <span className={`px-3 py-1 text-xs font-black flex items-center gap-1.5 rounded-xl ${header.bg}`}>
            <span className="text-sm">{header.emoji}</span>
            {header.label}
          </span>
          <span className="px-2.5 py-1 bg-rose-400 text-slate-950 rounded-xl font-black text-xs border-2 border-slate-950 flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Flame className="w-3.5 h-3.5 text-slate-950 shrink-0 fill-current" />
            {meal.calories}
          </span>
        </div>

        {totalAllergyWarningsInMeal > 0 && (
          <span className="px-2.5 py-1 bg-red-400 text-slate-950 rounded-lg text-xs font-extrabold flex items-center gap-1.5 border-2 border-slate-955 animate-bounce shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <ShieldAlert className="w-4 h-4 shrink-0 stroke-[2.5]" />
            주의식품 {totalAllergyWarningsInMeal}개 검출!
          </span>
        )}
      </div>

      {/* Dishes Menu List */}
      <div className="p-5 space-y-4">
        <div>
          <h4 className="text-xs font-black text-indigo-750 mb-3 uppercase tracking-wider">오늘의 식품 리스트</h4>
          <div className="space-y-2">
            {meal.dishes.map((dish, idx) => {
              const hasAllergyWarning = checkAllergyWarning(dish);
              
              return (
                <div 
                  key={idx}
                  className={`py-2 px-3.5 rounded-xl border-2 border-slate-950 text-sm flex items-center justify-between flex-wrap gap-2 transition-all ${
                    hasAllergyWarning 
                      ? "bg-rose-200 text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]" 
                      : "bg-white text-slate-800 font-bold hover:bg-slate-50 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border border-slate-950 ${hasAllergyWarning ? "bg-rose-600 animate-pulse" : "bg-emerald-450"}`}></span>
                    <span>{dish.clean}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Allergy Indicators */}
                    {dish.allergyCode && (
                      <div className="flex items-center gap-0.5">
                        {dish.allergyCode.split(".").map((codeStr, cIdx) => {
                          const code = codeStr.trim();
                          if (!code) return null;
                          const isTriggered = myAllergies.includes(code);
                          return (
                            <span 
                              key={cIdx}
                              title={`${code}번 식품: ${ALLERGY_MAP[code] || "알 수 없음"}`}
                              className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 cursor-pointer font-black shrink-0 transition-all ${
                                isTriggered 
                                  ? "bg-rose-500 border-slate-950 text-white shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] scale-110" 
                                  : "bg-white border-slate-900 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {ALLERGY_ICONS[code] || code}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gemini API Review Panel */}
        <div className="pt-4 border-t-2 border-dashed border-slate-300" id="gemini-review-panel">
          {commentary ? (
            <div className="bg-indigo-100 border-4 border-slate-950 rounded-2xl p-4.5 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -mr-6 -mt-6"></div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-indigo-750 stroke-[2.5]" />
                  Gemini AI 급식평평 ⭐
                </span>
                
                <div className="flex items-center gap-1 relative z-10">
                  <button 
                    onClick={handleCopy}
                    title="한줄평 복사"
                    className="p-1.5 bg-white text-slate-950 hover:bg-slate-100 border-2 border-slate-950 rounded-lg transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <p 
                id="gemini-commentary-text"
                className="text-slate-900 text-[13px] leading-relaxed font-bold pr-4 select-text italic"
                style={{ wordBreak: "keep-all" }}
              >
                "{commentary}"
              </p>
            </div>
          ) : (
            <button
              onClick={() => onGenerateCommentary(meal)}
              disabled={commentaryLoading}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-4 border-slate-955 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
                commentaryLoading 
                  ? "bg-slate-100 text-slate-400 border-slate-350 cursor-not-allowed shadow-none" 
                  : "bg-indigo-400 text-slate-950 hover:bg-indigo-350"
              }`}
            >
              {commentaryLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-800 border-t-transparent animate-spin"></div>
                  <span>Gemini가 맛 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 text-slate-950 animate-pulse fill-current" />
                  <span>AI 맛 평가단 드립 한줄평 듣기</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Nutritional & Origin details toggler */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-2.5 px-4 bg-amber-200 text-slate-950 rounded-2xl text-xs font-black flex items-center justify-between transition-all cursor-pointer border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] hover:bg-amber-300"
          >
            <span className="flex items-center gap-1.5 uppercase">
              <Info className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              원산지 & 영양 성분 세부표
            </span>
            {showDetails ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
          </button>

          {showDetails && (
            <div className="mt-3 p-4 bg-slate-50 border-2 border-slate-950 rounded-2xl text-xs space-y-4 animate-fadeIn shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              {meal.origins.length > 0 && (
                <div>
                  <h5 className="font-extrabold text-slate-900 mb-1.5 flex items-center gap-1">
                    <Apple className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    원산지 내역
                  </h5>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-800 bg-white p-2.5 rounded-xl border-2 border-slate-950 font-bold">
                    {meal.origins.map((origin, oIdx) => (
                      <span key={oIdx} className="truncate">{origin}</span>
                    ))}
                  </div>
                </div>
              )}

              {meal.nutrition.length > 0 && (
                <div>
                  <h5 className="font-extrabold text-slate-900 mb-1.5 flex items-center gap-1">
                    <Apple className="w-4 h-4 text-orange-650 stroke-[2.5]" />
                    성분 및 영양비율표
                  </h5>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-800 bg-white p-2.5 rounded-xl border-2 border-slate-950 font-bold">
                    {meal.nutrition.map((nut, nIdx) => (
                      <span key={nIdx} className="truncate">{nut}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
