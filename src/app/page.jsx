"use client"; //브라우저에서 실행

import { useState, useEffect } from "react"; //상태관리, 데이터 불러오기
import { createClient } from "@/lib/supabase"; //DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import Link from "next/link"; //클릭해서 이동하는 링크 태그
import styles from "./page.module.css";

export default function Home() {
  const [rooms, setRooms] = useState([]); //내가 참여한 방 목록
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    //컴포넌트가 처음 렌더링될 때 실행
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const supabase = createClient();

    //현재 로그인한 유저 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    //내가 참여한 방 목록 가져오기
    const { data } = await supabase
      .from("room_members")
      .select("room_id, rooms(id, name, code)") //rooms 테이블 join
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
