"use client"; //브라우저에서 실행

import { useState, useEffect, use } from "react"; //상태관리, 데이터 불러오기, params 풀기
import { createClient } from "@/lib/supabase"; //DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import Calendar from "@/components/calendar/Calendar"; //달력 컴포넌트
import styles from "./room.module.css";
import Link from "next/link";

export default function RoomPage({ params }) {
  const { id } = use(params); //params는 Promise라 use()로 풀어야 함
  const [room, setRoom] = useState(null); //방 정보
  const [members, setMembers] = useState([]); //멤버 목록
  const [currentUser, setCurrentUser] = useState(null); //현재 로그인한 유저
  const [loading, setLoading] = useState(false);
  const [myColor, setMyColor] = useState("#a5f3fc"); //내 색상

  const router = useRouter();

  useEffect(() => {
    //컴포넌트가 처음 렌더링될 때 실행
    fetchRoom();
  }, []);

  const fetchRoom = async () => {
    const supabase = createClient(); //supabase 연결 클라이언트 초기화

    //현재 로그인한 유저 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    setCurrentUser(user); //유저 정보 저장

    //내 색상 가져오기
    const { data: userData } = await supabase
      .from("users")
      .select("color")
      .eq("id", user.id)
      .single();

    if (userData?.color) setMyColor(userData.color);

    //방 정보 가져오기
    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    //멤버 목록 가져오기 (유저 닉네임, 색상도 같이)
    const { data: membersData } = await supabase
      .from("room_members")
      .select("user_id, users(nickname, color)")
      .eq("room_id", id);

    setRoom(roomData);
    setMembers(membersData || []);
    setLoading(false);
  };

  //색상 변경
  const handleColorChange = async (color) => {
    setMyColor(color);
    const supabase = createClient();
    await supabase.from("users").update({ color }).eq("id", currentUser.id);

    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === currentUser.id
          ? { ...m, users: { ...m.users, color } }
          : m,
      ),
    );
    //멤버 목록 다시 불러오기 (달력 색상 업데이트)💛💛💛💛💛💛💛💛💛
    fetchRoom();
  };

  //방 나가기
  const handleLeave = async () => {
    const supabase = createClient();

    await supabase
      .from("room_members")
      .delete()
      .eq("room_id", id)
      .eq("user_id", currentUser.id);

    router.push("/"); //홈으로 이동
  };

  if (loading) return <p>로딩 중...</p>;
  if (!room) return <p>방을 찾을 수 없어요.</p>;

  return (
    <main className={styles.container}>
      {/* 뒤로가기 */}
      <button onClick={() => router.push("/")} className={styles.back}>
        ←
      </button>

      <div className={styles.layout}>
        {/* 왼쪽 */}
        <div className={styles.left}>
          <h1 className={styles.title}>{room.name}</h1>

          {/* 방 코드 */}
          <div className={styles.codeBox}>
            <p className={styles.codeLabel}>방 코드</p>
            <p className={styles.code}>{room.code}</p>
          </div>

          {/* 멤버 목록 */}
          <div className={styles.members}>
            <p className={styles.memberLabel}>멤버 {members.length}명</p>
            {members.map((m) => (
              <p
                key={m.user_id}
                className={`${styles.member} ${m.user_id === currentUser?.id ? styles.me : ""}`}
              >
                {m.users?.nickname || "익명"}
                {m.user_id === currentUser?.id && " (나)"}
              </p>
            ))}
          </div>

          {/* 내 색상 선택 */}
          <div className={styles.colorPicker}>
            <p className={styles.memberLabel}>내 색상</p>
            <div className={styles.colorList}>
              {[
                "#a5f3fc",
                "#bbf7d0",
                "#fde68a",
                "#fca5a5",
                "#c4b5fd",
                "#fdba74",
                "#86efac",
                "#f9a8d4",
              ].map((color) => {
                const usedByOther = members.some(
                  (m) =>
                    m.user_id !== currentUser?.id && m.users?.color === color,
                );
                return (
                  <button
                    key={color}
                    onClick={() => !usedByOther && handleColorChange(color)}
                    className={`${styles.colorBtn} ${myColor === color ? styles.colorSelected : ""} ${usedByOther ? styles.colorDisabled : ""}`}
                    style={{ backgroundColor: color }}
                    disabled={usedByOther}
                  />
                );
              })}
            </div>
          </div>

          {/* 정산 */}
          <Link
            href={`/room/${id}/settlement`}
            className={styles.settlementLink}
          >
            정산 보기 →
          </Link>

          {/* 방 나가기 */}
          <button onClick={handleLeave} className={styles.leaveButton}>
            방 나가기
          </button>
        </div>

        {/* 오른쪽 - 달력 */}
        <div className={styles.right}>
          {currentUser && (
            <Calendar roomId={id} userId={currentUser.id} members={members} />
          )}
        </div>
      </div>
    </main>
  );
}
