"use client";

import { useState, useEffect, use } from "react"; //use 추가
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import styles from "./room.module.css";

export default function RoomPage({ params }) {
  const { id } = use(params); //params를 use()로 풀기
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchRoom();
  }, []);

  const fetchRoom = async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id) //params.id 대신 id 사용
      .single();

    const { data: membersData } = await supabase
      .from("room_members")
      .select("user_id, users(nickname)")
      .eq("room_id", id);

    setRoom(roomData);
    setMembers(membersData || []);
    setLoading(false);
  };

  if (loading) return <p>로딩 중...</p>;
  if (!room) return <p>방을 찾을 수 없어요.</p>;

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{room.name}</h1>
        <div className={styles.codeBox}>
          <p className={styles.codeLabel}>방 코드</p>
          <p className={styles.code}>{room.code}</p>
        </div>
        <div className={styles.members}>
          <p className={styles.memberLabel}>멤버 {members.length}명</p>
          {members.map((m) => (
            <p key={m.user_id} className={styles.member}>
              {m.users?.nickname || "익명"}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
