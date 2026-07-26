"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

//테마 프리셋
const THEMES = [
  { name: "블루", primary: "#85D0FF", bg: "#EBF6FD", border: "#B8E4FF" },
  { name: "보라", primary: "#C4B5FD", bg: "#F3F0FF", border: "#DDD6FE" },
  { name: "핑크", primary: "#FFB5C8", bg: "#FFF0F4", border: "#FFD6E3" },
  { name: "민트", primary: "#86EFAC", bg: "#F0FDF4", border: "#BBF7D0" },
  { name: "노랑", primary: "#FDE68A", bg: "#FFFDE7", border: "#FEF08A" },
];

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState(0);

  const router = useRouter();

  useEffect(() => {
    //저장된 테마 불러오기
    const saved = localStorage.getItem("modam-theme");
    if (saved) {
      const index = THEMES.findIndex((t) => t.name === saved);
      if (index !== -1) {
        setCurrentTheme(index);
        applyTheme(THEMES[index]);
      }
    } else {
      applyTheme(THEMES[0]);
    }
    fetchRooms();
  }, []);

  //테마 적용
  const applyTheme = (theme) => {
    document.documentElement.style.setProperty("--primary", theme.primary);
    document.documentElement.style.setProperty("--bg", theme.bg);
    document.documentElement.style.setProperty("--border", theme.border);
    document.documentElement.style.setProperty("--primary-dark", theme.primary);
  };

  const handleTheme = (index) => {
    setCurrentTheme(index);
    applyTheme(THEMES[index]);
    localStorage.setItem("modam-theme", THEMES[index].name);
  };

  const fetchRooms = async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data } = await supabase
      .from("room_members")
      .select("room_id, rooms(id, name, code)")
      .eq("user_id", user.id);

    setRooms(data || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>MODAM</h1>
        <button onClick={handleLogout} className={styles.logout}>
          로그아웃
        </button>
      </div>

      {/* 테마 선택 */}
      <div className={styles.themeRow}>
        {THEMES.map((t, i) => (
          <button
            key={t.name}
            onClick={() => handleTheme(i)}
            className={`${styles.themeBtn} ${currentTheme === i ? styles.themeSelected : ""}`}
            style={{ backgroundColor: t.primary }}
            title={t.name}
          />
        ))}
      </div>

      {/* 방 목록 */}
      <div className={styles.roomList}>
        {rooms.length === 0 ? (
          <p className={styles.empty}>참여한 방이 없어요.</p>
        ) : (
          rooms.map((r) => (
            <Link
              key={r.room_id}
              href={`/room/${r.room_id}`}
              className={styles.roomCard}
            >
              <p className={styles.roomName}>{r.rooms?.name}</p>
              <p className={styles.roomCode}>{r.rooms?.code}</p>
            </Link>
          ))
        )}
      </div>

      {/* 하단 버튼 */}
      <div className={styles.buttons}>
        <Link href="/room/create" className={styles.button}>
          방 만들기
        </Link>
        <Link href="/room/join" className={styles.button}>
          방 참여
        </Link>
      </div>
    </main>
  );
}
