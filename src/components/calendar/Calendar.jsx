/*
useEffect 의존성 배열
useEffect(() => {
  fetchRoom();
}, []); // ← 빈 배열이면 처음 한 번만 실행
*/
"use client"; //브라우저에서 실행

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import styles from "./Calendar.module.css";

export default function Calendar({ roomId, userId }) {
  //roomId, userId는 부모 컴포넌트(방 페이지)에서 받아오는 값 (props)
  const [currentDate, setCurrentDate] = useState(new Date()); //현재 보여주는 달
  const [myDates, setMyDates] = useState([]); //내가 선택한 날짜들
  const [memberDates, setMemberDates] = useState({}); //멤버들이 선택한 날짜 (날짜별 인원수)

  useEffect(() => {
    fetchDates();
  }, [currentDate]); //달이 바뀔 때마다 다시 불러오기

  const fetchDates = async () => {
    const supabase = createClient();

    //이번 달 시작일, 종료일 계산
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];

    //이 방의 이번 달 전체 날짜 데이터 가져오기
    const { data } = await supabase
      .from("available_dates")
      .select("user_id, date")
      .eq("room_id", roomId)
      .gte("date", firstDay) //firstDay 이후
      .lte("date", lastDay); //lastDay 이전

    if (!data) return;

    //내가 선택한 날짜 필터링
    const my = data.filter((d) => d.user_id === userId).map((d) => d.date);
    setMyDates(my);

    //날짜별 선택한 인원수 계산
    const counts = {};
    data.forEach((d) => {
      counts[d.date] = (counts[d.date] || 0) + 1;
    });
    setMemberDates(counts);
  };

  const toggleDate = async (dateStr) => {
    //날짜 선택/해제
    const supabase = createClient();
    const isSelected = myDates.includes(dateStr);

    if (isSelected) {
      //이미 선택된 날짜면 삭제
      await supabase
        .from("available_dates")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .eq("date", dateStr);

      setMyDates(myDates.filter((d) => d !== dateStr));
    } else {
      //선택 안 된 날짜면 추가
      await supabase.from("available_dates").insert({
        room_id: roomId,
        user_id: userId,
        date: dateStr,
      });

      setMyDates([...myDates, dateStr]);
    }

    fetchDates(); //다시 불러와서 멤버 현황 업데이트
  };

  //달력 날짜 배열 만들기
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); //첫째 날 요일 (0=일요일)
    const daysInMonth = new Date(year, month + 1, 0).getDate(); //이번 달 총 일수

    const days = [];

    //첫째 날 전 빈칸 채우기
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    //날짜 채우기
    for (let i = 1; i <= daysInMonth; i++) {
      const month2 = String(month + 1).padStart(2, "0"); //01, 02 형태
      const day = String(i).padStart(2, "0");
      days.push(`${year}-${month2}-${day}`);
    }

    return days;
  };

  //인원수에 따라 배경색 결정
  const getColor = (count, total) => {
    if (!count) return "";
    const ratio = count / total;
    if (ratio === 1) return styles.full; //전원 가능
    if (ratio >= 0.5) return styles.half; //절반 이상
    return styles.some; //일부
  };

  const days = getDaysInMonth();
  //연속 날짜 스타일 계산
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

    if (hasPrev && hasNext) return styles.rangeMiddle; //중간
    if (hasPrev) return styles.rangeEnd; //끝
    if (hasNext) return styles.rangeStart; //시작
    return ""; //단독
  };
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const totalMembers = new Set(Object.values(memberDates)).size || 1; //총 멤버수 (중복 제거)

  return (
    <div className={styles.container}>
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
        {days.map((dateStr, i) => (
          <div
            key={i}
            onClick={() => dateStr && toggleDate(dateStr)}
            className={`${styles.day} 
  ${!dateStr ? styles.empty : ""} 
  ${dateStr && myDates.includes(dateStr) ? styles.selected : ""} 
  ${dateStr ? getColor(memberDates[dateStr], totalMembers) : ""}
  ${getRangeStyle(dateStr)}`}
          >
            {dateStr ? parseInt(dateStr.split("-")[2]) : ""}
            {/* 인원수 표시 */}
            {dateStr && memberDates[dateStr] && (
              <span className={styles.count}>{memberDates[dateStr]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
