"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import styles from "./Calendar.module.css";

//멤버별 색상 팔레트
const COLORS = [
  "#a5f3fc", //하늘
  "#bbf7d0", //민트
  "#fde68a", //노랑
  "#fca5a5", //빨강
  "#c4b5fd", //보라
  "#fdba74", //주황
  "#86efac", //초록
  "#f9a8d4", //분홍
];

export default function Calendar({ roomId, userId, members }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [myDates, setMyDates] = useState([]);
  const [allDates, setAllDates] = useState([]); //전체 날짜 데이터 (유저별)

  const getMemberColor = (uid) => {
    const index = members.findIndex((m) => m.user_id === uid);
    console.log("uid:", uid, "index:", index, "members:", members);
    return COLORS[index % COLORS.length];
  };

  useEffect(() => {
    fetchDates();
  }, [currentDate]);

  const fetchDates = async () => {
    const supabase = createClient();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const { data } = await supabase
      .from("available_dates")
      .select("user_id, date")
      .eq("room_id", roomId)
      .gte("date", firstDay)
      .lte("date", lastDay);

    if (!data) return;

    const my = data.filter((d) => d.user_id === userId).map((d) => d.date);
    setMyDates(my);
    setAllDates(data);
  };

  const toggleDate = async (dateStr) => {
    const supabase = createClient();
    const isSelected = myDates.includes(dateStr);

    if (isSelected) {
      await supabase
        .from("available_dates")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .eq("date", dateStr);

      setMyDates(myDates.filter((d) => d !== dateStr));
    } else {
      await supabase.from("available_dates").insert({
        room_id: roomId,
        user_id: userId,
        date: dateStr,
      });

      setMyDates([...myDates, dateStr]);
    }

    fetchDates();
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const m = String(month + 1).padStart(2, "0");
      const d = String(i).padStart(2, "0");
      days.push(`${year}-${m}-${d}`);
    }
    return days;
  };

  const getRangeStyle = (dateStr) => {
    if (!dateStr || !myDates.includes(dateStr)) return "";

    const prev = new Date(dateStr);
    prev.setDate(prev.getDate() - 1);
    const prevStr = prev.toISOString().split("T")[0];

    const next = new Date(dateStr);
    next.setDate(next.getDate() + 1);
    const nextStr = next.toISOString().split("T")[0];

    const hasPrev = myDates.includes(prevStr);
    const hasNext = myDates.includes(nextStr);

    if (hasPrev && hasNext) return styles.rangeMiddle;
    if (hasPrev) return styles.rangeEnd;
    if (hasNext) return styles.rangeStart;
    return "";
  };

  //날짜별 선택한 멤버 색상 가져오기
  const getDateColors = (dateStr) => {
    return allDates
      .filter((d) => d.date === dateStr)
      .map((d) => getMemberColor(d.user_id));
  };

  const days = getDaysInMonth();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  return (
    <div className={styles.container}>
      {/* 멤버 색상 범례 */}
      <div className={styles.legend}>
        {members.map((m, i) => (
          <div key={m.user_id} className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className={styles.legendName}>
              {m.users?.nickname || "익명"}
            </span>
          </div>
        ))}
      </div>

      {/* 달 이동 */}
      <div className={styles.header}>
        <button
          onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
          className={styles.arrow}
        >
          ←
        </button>
        <span className={styles.month}>
          {year}년 {month}월
        </span>
        <button
          onClick={() => setCurrentDate(new Date(year, month, 1))}
          className={styles.arrow}
        >
          →
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className={styles.weekdays}>
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className={styles.grid}>
        {days.map((dateStr, i) => {
          const colors = dateStr ? getDateColors(dateStr) : [];
          return (
            <div
              key={i}
              onClick={() => dateStr && toggleDate(dateStr)}
              className={`${styles.day}
                ${!dateStr ? styles.empty : ""}
                ${dateStr && myDates.includes(dateStr) ? styles.selected : ""}
                ${getRangeStyle(dateStr)}`}
            >
              {dateStr ? parseInt(dateStr.split("-")[2]) : ""}

              {/* 멤버 색상 점 표시 */}
              {colors.length > 0 && (
                <div className={styles.dots}>
                  {colors.map((color, idx) => (
                    <div
                      key={idx}
                      className={styles.dot}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
