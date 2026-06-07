import React, { useState, useEffect } from "react";
import { 
  Utensils, 
  Calendar as CalendarIcon, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  ShieldAlert, 
  Flame, 
  Info, 
  LayoutGrid, 
  HelpCircle,
  AlertTriangle,
  Github
} from "lucide-react";
import { School, Meal, ALLERGY_MAP, ALLERGY_ICONS } from "./types";
import SchoolSearch from "./components/SchoolSearch";
import MealCard from "./components/MealCard";

export default function App() {
  // State for user preferences (persisted in localStorage)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(() => {
    const stored = localStorage.getItem("selectedSchool");
    return stored ? JSON.parse(stored) : null;
  });

  const [myAllergies, setMyAllergies] = useState<string[]>(() => {
    const stored = localStorage.getItem("myAllergies");
    return stored ? JSON.parse(stored) : [];
  });

  // State for date selection
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
  });

  // State for meals and client data loading
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for Gemini AI Commentaries (mapped by mealCode)
  const [commentaries, setCommentaries] = useState<{ [mealCode: string]: string }>({});
  const [commentaryLoadingMap, setCommentaryLoadingMap] = useState<{ [mealCode: string]: boolean }>({});

  const [showAllergySettings, setShowAllergySettings] = useState(false);

  // Persistence side-effects
  useEffect(() => {
    if (selectedSchool) {
      localStorage.setItem("selectedSchool", JSON.stringify(selectedSchool));
    } else {
      localStorage.removeItem("selectedSchool");
    }
  }, [selectedSchool]);

  useEffect(() => {
    localStorage.setItem("myAllergies", JSON.stringify(myAllergies));
  }, [myAllergies]);

  // When school or date changes, fetch meal records and clear cached comments
  useEffect(() => {
    if (!selectedSchool) {
      setMeals([]);
      return;
    }

    const fetchMeals = async () => {
      setLoading(true);
      setError(null);
      setCommentaries({}); // Clear commentary cache for new school/date selection
      
      const formattedDate = selectedDate.replace(/-/g, ""); // "YYYYMMDD"
      try {
        const response = await fetch(
          `/api/meal?schoolCode=${selectedSchool.schoolCode}&officeCode=${selectedSchool.officeCode}&date=${formattedDate}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "급식 정보를 가져오는 데 실패했습니다.");
        }

        if (data.meals && data.meals.length > 0) {
          setMeals(data.meals);
        } else {
          setMeals([]);
          if (data.message) {
            setError(data.message); // e.g. "해당하는 데이터가 없습니다."
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "나이스 서버에 연결하는 중 에러가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, [selectedSchool, selectedDate]);

  // Method to request Gemini commentary
  const handleGenerateCommentary = async (meal: Meal) => {
    const mealCode = meal.mealCode;
    setCommentaryLoadingMap(prev => ({ ...prev, [mealCode]: true }));

    try {
      const response = await fetch("/api/commentary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolName: selectedSchool?.schoolName,
          mealName: meal.mealName,
          menuList: meal.dishes.map(d => d.clean),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gemini AI 한줄평을 생성하는 도중 오류가 발생했습니다.");
      }

      setCommentaries(prev => ({
        ...prev,
        [mealCode]: data.commentary,
      }));
    } catch (err: any) {
      alert(err.message || "한줄평 중 발생한 에러: 코드를 세팅하십시오.");
    } finally {
      setCommentaryLoadingMap(prev => ({ ...prev, [mealCode]: false }));
    }
  };

  // Helper date jumps
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const jumpToShortcut = (type: "today" | "tomorrow" | "yesterday") => {
    const target = new Date();
    if (type === "yesterday") target.setDate(target.getDate() - 1);
    if (type === "tomorrow") target.setDate(target.getDate() + 1);
    
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Generate Week view slider array around selected date
  const getWeekDays = () => {
    const baseDate = new Date(selectedDate);
    const dayOfWeek = baseDate.getDay(); // 0(Sun) - 6(Sat)
    
    const days = [];
    const KR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

    // Return the full week (Monday - Sunday) matching current week
    for (let i = 1; i <= 7; i++) {
      const offset = i - (dayOfWeek === 0 ? 7 : dayOfWeek); // Make Monday index 1
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      
      days.push({
        dateStr: formatted,
        dayNum: d.getDate(),
        dayLabel: KR_DAYS[d.getDay()],
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: (() => {
          const t = new Date();
          return t.getFullYear() === yyyy && (t.getMonth() + 1) === d.getMonth() + 1 && t.getDate() === d.getDate();
        })(),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Allergies handlers
  const toggleAllergy = (code: string) => {
    setMyAllergies(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const resetAllergies = () => {
    setMyAllergies([]);
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-slate-900 font-sans p-4 md:p-8 animate-fadeIn" id="app-root">
      {/* Maximum Width Nested Container */}
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border-4 border-slate-950 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-400 p-3 rounded-2xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <Utensils className="w-8 h-8 text-slate-955 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic flex items-center gap-2">
                나이스 급식 AI 한줄평 🪄
              </h1>
              <p className="text-xs text-slate-550 font-bold">
                NEIS OpenAPI 실시간 급식 데이터 & Gemini 3.5 Flash 지능형 리뷰어
              </p>
            </div>
          </div>
          
          <div className="flex gap-2.5 flex-wrap justify-center">
            <div className="bg-emerald-400 px-3.5 py-1.5 rounded-full border-2 border-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-950">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
              NICE API Connected
            </div>
            <div className="bg-indigo-400 px-3.5 py-1.5 rounded-full border-2 border-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-950">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
              Gemini Direct Active
            </div>
          </div>
        </header>

        {/* Step 1: School Search & Configuration Bar */}
        <section className="bg-white border-4 border-slate-950 rounded-[2.5rem] p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-black text-indigo-750 uppercase tracking-wider">나의 학교 설정</h2>
              <p className="text-xs text-slate-600 mt-0.5 font-bold">전국 초·중·고등학교의 식단을 한눈에 검색하고 조회합니다.</p>
            </div>
            {selectedSchool && (
              <button
                id="toggle-allergy-settings-btn"
                onClick={() => setShowAllergySettings(!showAllergySettings)}
                className={`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border-2 border-slate-955 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                  showAllergySettings || myAllergies.length > 0 
                  ? "bg-rose-400 text-slate-950" 
                  : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                }`}
              >
                🍳 알레르기 관리 {myAllergies.length > 0 && `(${myAllergies.length})`}
              </button>
            )}
          </div>

          <SchoolSearch 
            onSelectSchool={(school) => setSelectedSchool(school)}
            selectedSchool={selectedSchool}
          />

          {/* Allergy Panel Dropdown */}
          {showAllergySettings && selectedSchool && (
            <div className="p-5 bg-rose-50/50 border-4 border-slate-955 rounded-[2rem] space-y-4 animate-slideDown" id="allergy-settings-panel">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">알레르기 유발 식품 알람 설정</h3>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">내가 민감한 식품을 체크해두면 식단표에서 자동으로 경고 아이콘과 경고 배너를 표시합니다.</p>
                  </div>
                </div>
                {myAllergies.length > 0 && (
                  <button 
                    onClick={resetAllergies}
                    className="text-xs font-black text-rose-700 hover:text-rose-950 px-2.5 py-1.5 bg-rose-200 border-2 border-slate-950 rounded-xl cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  >
                    모두 해제
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.entries(ALLERGY_MAP).map(([code, name]) => {
                  const isChecked = myAllergies.includes(code);
                  const icon = ALLERGY_ICONS[code] || "🍽️";
                  return (
                    <button
                      key={code}
                      onClick={() => toggleAllergy(code)}
                      className={`text-left p-2.5 rounded-xl border-2 border-slate-950 text-xs flex items-center gap-2 transition-all cursor-pointer select-none outline-none ${
                        isChecked 
                          ? "bg-rose-400 text-slate-950 font-black shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] ring-2 ring-slate-950" 
                          : "bg-white text-slate-700 font-bold hover:border-slate-800 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      }`}
                    >
                      <span className="text-base shrink-0">{icon}</span>
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Dashboard Actions if School is active */}
        {selectedSchool ? (
          <div className="grid grid-cols-1 gap-8" id="dashboard-layout">
            
            {/* Step 2: Date Selector Block */}
            <section className="bg-white border-4 border-slate-950 rounded-[2.5rem] p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600 stroke-[2.5]" />
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">조회 날짜 선택</h3>
                </div>

                {/* Shortcuts & Native Picker */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-950 flex gap-1">
                    <button 
                      onClick={() => jumpToShortcut("yesterday")}
                      className="px-3 py-1 text-[11px] font-black text-slate-700 hover:text-slate-900 bg-transparent rounded-lg transition-colors cursor-pointer"
                    >
                      어제
                    </button>
                    <button 
                      onClick={() => jumpToShortcut("today")}
                      className="px-3 py-1 text-[11px] font-black text-slate-900 bg-orange-400 border border-slate-950 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] rounded-lg transition-colors cursor-pointer"
                    >
                      오늘
                    </button>
                    <button 
                      onClick={() => jumpToShortcut("tomorrow")}
                      className="px-3 py-1 text-[11px] font-black text-slate-700 hover:text-slate-900 bg-transparent rounded-lg transition-colors cursor-pointer"
                    >
                      내일
                    </button>
                  </div>

                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="p-1.5 px-3 border-2 border-slate-950 rounded-xl text-xs font-black text-slate-800 bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] outline-none focus:bg-amber-50 cursor-pointer"
                  />
                </div>
              </div>

              {/* Week Slider Card Interface */}
              <div className="grid grid-cols-7 gap-2 text-center" id="week-calendar-slider">
                {weekDays.map((day) => {
                  const isSelected = day.dateStr === selectedDate;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-between gap-1 transition-all group cursor-pointer outline-none border-2 border-slate-950 ${
                        isSelected 
                          ? "bg-orange-400 text-slate-950 bg-gradient-to-br from-orange-400 to-amber-300 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-extrabold translate-y-[-2px]" 
                          : "bg-white text-slate-800 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      }`}
                    >
                      <span className={`text-[10px] md:text-sm tracking-wider font-extrabold ${
                        isSelected ? "text-slate-955" : day.isWeekend ? "text-rose-600" : "text-slate-500"
                      }`}>
                        {day.dayLabel}
                      </span>
                      <span className="text-sm md:text-lg font-black block">
                        {day.dayNum}
                      </span>
                      {day.isToday && (
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-slate-950" : "bg-indigo-650"}`}></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: Meal Card Output Dashboard */}
            <section className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg md:text-xl uppercase tracking-tight flex items-center gap-2">
                    🍽️ {new Date(selectedDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })} 급식메뉴
                  </h3>
                </div>
                {loading && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-black animate-pulse bg-indigo-50 border-2 border-slate-950 p-1.5 px-3 rounded-full">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-650" />
                    NEIS DATA LOADING...
                  </div>
                )}
              </div>

              {error && !loading && (
                <div 
                  id="meal-status-error"
                  className="bg-amber-100 border-4 border-slate-950 rounded-[2.5rem] p-8 text-center max-w-xl mx-auto space-y-4 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
                >
                  <div className="w-14 h-14 bg-amber-200 text-amber-950 rounded-full flex items-center justify-center mx-auto border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <Info className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black text-slate-900 text-lg">오늘은 급식 없는 날 🥳</h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-bold">
                      주말, 공휴일, 방학 중이거나 학교 측에서 업로드한 급식 일정이 등록되지 않았습니다.<br />
                      {error === "해당하는 데이터가 없습니다." ? "" : `(나이스 알람: ${error})`}
                    </p>
                  </div>
                </div>
              )}

              {!loading && !error && meals.length === 0 && (
                <div className="bg-white border-4 border-slate-950 rounded-[2.5rem] p-10 text-center max-w-lg mx-auto space-y-4 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                  <div className="w-14 h-14 bg-slate-100 text-slate-705 rounded-full flex items-center justify-center mx-auto border-2 border-slate-950">
                    <Utensils className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">급식 일정이 없습니다.</h4>
                    <p className="text-xs text-slate-600 font-bold mt-1">다른 일자를 선택해보시거나 학교 이름을 다시 확인해주세요.</p>
                  </div>
                </div>
              )}

              {!loading && meals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="meal-cards-grid">
                  {meals.map((meal) => (
                    <MealCard 
                      key={meal.mealCode}
                      meal={meal}
                      schoolName={selectedSchool.schoolName}
                      myAllergies={myAllergies}
                      commentaryLoading={!!commentaryLoadingMap[meal.mealCode]}
                      commentary={commentaries[meal.mealCode] || null}
                      onGenerateCommentary={handleGenerateCommentary}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Landing Screen if no school selected */
          <section className="bg-white border-4 border-slate-950 rounded-[3rem] p-8 md:p-12 text-center shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] max-w-2xl mx-auto space-y-6 my-4 animate-fadeIn" id="welcome-landing">
            <div className="inline-flex p-4 bg-orange-400 text-slate-950 rounded-3xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <Sparkles className="w-12 h-12 text-slate-955 stroke-[2.5] animate-bounce" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight italic">
                오늘 급식의 주인공은 누굴까? 🍖
              </h2>
              <p className="text-slate-700 text-xs md:text-sm max-w-lg mx-auto leading-relaxed font-bold">
                나이스 교육정보 개방포털에서 실시간으로 전국 초·중·고등학교 급식 정보를 받아오고, Gemini 인공지능이 센스 가득한 급식 드립과 유쾌한 한줄평을 들려주는 신개념 급식 피드앱입니다.
              </p>
            </div>

            <div className="border-4 border-slate-955 p-5 rounded-2xl bg-amber-50 max-w-md mx-auto text-left flex gap-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <Info className="w-6 h-6 text-indigo-700 shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">사용하는 방법</h4>
                <p className="text-xs text-slate-750 mt-1 leading-relaxed font-semibold font-sans">
                  위 입력창에 재학 중이거나 궁금한 국내 초·중·고 학업기관명(예: 반포고)을 검색하고 선택해주세요. 간편설정 후 바로 실시간 급식이 조회됩니다.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Elegant, humble details footer */}
      <footer className="mt-16 bg-transparent text-xs text-slate-600 max-w-5xl mx-auto pt-6 border-t-2 border-slate-950/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-black">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-slate-800 shrink-0" />
            <span>&copy; 2026 나이스 급식 AI. All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-700 tracking-wider">
            <span>ENV: KEY_ENV_LOADED</span>
            <span>&bull;</span>
            <span>NICE OPENAPI</span>
            <span>&bull;</span>
            <span>GEMINI 3.5 FLASH</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
