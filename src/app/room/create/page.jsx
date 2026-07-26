"use client"; //브라우저에서 실행

import { useState } from "react"; //화면의 상태를 기억/변경
import { createClient } from "@/lib/supabase"; //DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import styles from "./create.module.css";

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState(""); //방 이름 상태
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // 랜덤 6자리 코드 생성 함수
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
    //Math.random() = 0~1 사이 소수 생성
    //.toString(36) = 36진수 문자열로 변환(숫자+알파벳)
    //.substring(2, 8) = 앞에 0. 빼고 6자리 까지만 자르기
    //.toUpperCase() = 그 후 대문자 변환
  };

  const handleCreate = async () => {
    if (!roomName.trim()) {
      setError("방 이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    // 현재 로그인한 유저 supabase에서 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      //로그인 안됬으면 로그인 페이지로
      router.push("/auth/login");
      return;
    }

    const code = generateCode(); //랜덤 코드 생성

    // rooms 테이블에 방 저장
    const { data, error: roomError } = await supabase
      .from("rooms") //room테이블에
      //추가
      .insert({
        name: roomName,
        code: code,
        created_by: user.id,
      })
      .select() // 추가된 행 데이터 가져오기
      .single(); // 배열 말고 객체 하나로

    if (roomError) {
      setError("방 생성에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    // 방장을 room_members에 자동 추가
    await supabase.from("room_members").insert({
      room_id: data.id,
      user_id: user.id,
    });

    router.push(`/room/${data.id}`); //방 상세 페이지로 이동
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <button onClick={() => router.push("/")} className={styles.back}>
          ←
        </button>
        <h1 className={styles.title}>방 만들기</h1>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="방 이름"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading}
            className={styles.button}
          >
            {loading ? "생성 중..." : "방 만들기"}
          </button>
        </div>
      </div>
    </main>
  );
}
