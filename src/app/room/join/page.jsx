"use client"; //브라우저에서 실행

import { useState } from "react"; //화면의 상태를 기억/변경
import { createClient } from "@/lib/supabase"; //DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import styles from "./join.module.css";

export default function JoinRoomPage() {
  const [code, setCode] = useState(""); //입력한 방 코드
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("방 코드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    //현재 로그인한 유저 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    //입력한 코드로 방 찾기
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase()) //대문자로 변환해서 비교
      .single();

    if (roomError || !room) {
      setError("존재하지 않는 방 코드예요.");
      setLoading(false);
      return;
    }

    //이미 참여한 멤버인지 확인
    const { data: existing } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      //이미 참여중이면 바로 방으로 이동
      router.push(`/room/${room.id}`);
      return;
    }

    //room_members에 추가
    const { error: joinError } = await supabase.from("room_members").insert({
      room_id: room.id,
      user_id: user.id,
    });

    if (joinError) {
      setError("방 참여에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.push(`/room/${room.id}`); //방 페이지로 이동
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>방 참여</h1>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="방 코드 입력"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading}
            className={styles.button}
          >
            {loading ? "참여 중..." : "참여하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
