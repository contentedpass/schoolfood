import React, { useState, useEffect } from "react";
import { Search, School as SchoolIcon, MapPin, Loader2, X, Check } from "lucide-react";
import { School } from "../types";

interface SchoolSearchProps {
  onSelectSchool: (school: School) => void;
  selectedSchool: School | null;
}

export default function SchoolSearch({ onSelectSchool, selectedSchool }: SchoolSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingListOpen, setIsSearchingListOpen] = useState(false);

  useEffect(() => {
    if (!keyword || keyword.trim().length < 2) {
      setSchools([]);
      setError(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/schools?keyword=${encodeURIComponent(keyword.trim())}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "학교 목록을 가져오는 데 실패했습니다.");
        }

        if (data.schools) {
          setSchools(data.schools);
          if (data.schools.length === 0 && data.message) {
            setError(data.message || "검색 결과가 없습니다.");
          }
        } else {
          setSchools([]);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "학교 정보를 검색할 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }, 450); // Debounce API requests

    return () => clearTimeout(delayDebounceFn);
  }, [keyword]);

  const handleSelect = (school: School) => {
    onSelectSchool(school);
    setKeyword("");
    setSchools([]);
    setIsSearchingListOpen(false);
  };

  const clearSelection = () => {
    // We let the user clear, but the app state will handle the actual wipe
    setKeyword("");
    setSchools([]);
    setIsSearchingListOpen(false);
  };

  return (
    <div className="w-full relative" id="school-search-container">
      {selectedSchool ? (
        <div 
          id="selected-school-card"
          className="flex items-center justify-between p-4 bg-white border-4 border-slate-950 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-50 border-2 border-slate-950 text-indigo-700 rounded-xl shrink-0">
              <SchoolIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm md:text-base">
                  {selectedSchool.schoolName}
                </h4>
                <span className="px-2 py-0.5 bg-emerald-350 text-slate-950 border border-slate-950 text-[10px] md:text-xs rounded-lg font-black">
                  {selectedSchool.location}
                </span>
              </div>
              <p className="text-xs text-slate-650 flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="truncate max-w-[200px] md:max-w-xs">{selectedSchool.address}</span>
              </p>
            </div>
          </div>
          <button
            id="change-school-btn"
            onClick={() => {
              // Custom implementation triggers parent clearance or simple text input show
              setKeyword("");
              setIsSearchingListOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            학교 변경
          </button>
        </div>
      ) : (
        <div className="w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-5 h-5 stroke-[2.5]" />
            </div>
            <input
              type="text"
              id="school-search-input"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setIsSearchingListOpen(true);
              }}
              placeholder="🏫 조회하려는 학교 이름을 입력해주세요 (예: 서울고, 백양중)"
              className="w-full pl-11 pr-10 py-3.5 bg-white border-4 border-slate-950 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm font-bold shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            />
            {keyword && (
              <button
                onClick={clearSelection}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-950 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Autocomplete Lists */}
          {isSearchingListOpen && (keyword.trim().length >= 2 || loading) && (
            <div 
              id="school-search-results"
              className="absolute z-40 w-full mt-3 bg-white border-4 border-slate-950 rounded-2xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-h-72 overflow-y-auto divide-y-2 divide-slate-150 transition-all duration-300"
            >
              {loading && (
                <div className="p-4 text-center text-slate-700 flex items-center justify-center gap-2 font-bold">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                  <span className="text-xs">학교 목록을 찾는 중...</span>
                </div>
              )}

              {!loading && error && (
                <div className="p-4 text-center text-rose-600 text-xs font-bold">
                  {error}
                </div>
              )}

              {!loading && !error && schools.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs font-bold">
                  검색된 학교가 없습니다. 정확한 학교명을 입력해보세요.
                </div>
              )}

              {!loading && schools.map((school) => (
                <button
                  key={`${school.officeCode}-${school.schoolCode}`}
                  onClick={() => handleSelect(school)}
                  className="w-full text-left p-3.5 hover:bg-slate-50 flex items-center justify-between transition-colors outline-none group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <span className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-indigo-50 border border-slate-300 group-hover:border-slate-950 transition-all shrink-0">
                      <SchoolIcon className="w-4 h-4 text-slate-650 group-hover:text-indigo-700 transition-colors" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {school.schoolName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold border border-slate-200">
                          {school.officeName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {school.address}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-indigo-650 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                    선택
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
