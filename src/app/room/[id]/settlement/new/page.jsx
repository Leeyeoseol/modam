"use client"; //브라우저에서 실행

import { useState, useEffect, use } from "react"; //상태관리, 데이터 불러오기, params 풀기
import { createClient } from "@/lib/supabase"; //DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import styles from "./new.module.css";

export default function NewSettlementPage({ params }) {
  const { id } = use(params); //방 id
  const [members, setMembers] = useState([]); //방 멤버 목록
  const [currentUser, setCurrentUser] = useState(null); //현재 유저
  const [title, setTitle] = useState(""); //지출 항목명
  const [totalAmount, setTotalAmount] = useState(""); //총 금액
  const [paidBy, setPaidBy] = useState(""); //결제자
  const [selectedMembers, setSelectedMembers] = useState([]); //정산 참여자
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const supabase = createClient();

    //현재 로그인한 유저 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    setCurrentUser(user);
    setPaidBy(user.id); //기본 결제자는 본인

    //방 멤버 목록 가져오기
    const { data } = await supabase
      .from("room_members")
      .select("user_id, users(nickname)")
      .eq("room_id", id);

    setMembers(data || []);
    //기본으로 전체 멤버 선택
    setSelectedMembers(data?.map((m) => m.user_id) || []);
  };

  //참여자 선택/해제 토글
  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("지출 항목을 입력해주세요.");
      return;
    }
    if (!totalAmount || isNaN(totalAmount) || Number(totalAmount) <= 0) {
      setError("올바른 금액을 입력해주세요.");
      return;
    }
    if (selectedMembers.length === 0) {
      setError("참여자를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const amount = Number(totalAmount);
    //1인당 금액 계산 (소수점 버림)
    const perPerson = Math.floor(amount / selectedMembers.length);

    //settlements 테이블에 저장
    const { data: settlement, error: settlementError } = await supabase
      .from("settlements")
      .insert({
        room_id: id,
        title: title,
        total_amount: amount,
        created_by: currentUser.id,
        date: new Date().toISOString().split("T")[0], //오늘 날짜
      })
      .select()
      .single();

    if (settlementError) {
      setError("정산 추가에 실패했어요.");
      setLoading(false);
      return;
    }

    //settlement_members에 참여자별 금액 저장
    const memberRows = selectedMembers.map((userId) => ({
      settlement_id: settlement.id,
      user_id: userId,
      amount: perPerson,
      is_paid: userId === paidBy, //결제자는 이미 낸 것으로 처리
    }));

    await supabase.from("settlement_members").insert(memberRows);

    router.push(`/room/${id}/settlement`); //정산 목록으로 이동
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <button
          onClick={() => router.push(`/room/${id}/settlement`)}
          className={styles.back}
        >
          ←
        </button>
        <h1 className={styles.title}>정산 추가</h1>

        <div className={styles.form}>
          {/* 지출 항목 */}
          <input
            type="text"
            placeholder="지출 항목 (예: 저녁식사)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />

          {/* 총 금액 */}
          <input
            type="number"
            placeholder="총 금액"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className={styles.input}
          />

          {/* 결제자 선택 */}
          <div className={styles.section}>
            <p className={styles.label}>결제자</p>
            <div className={styles.memberList}>
              {members.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => setPaidBy(m.user_id)}
                  className={`${styles.memberBtn} ${paidBy === m.user_id ? styles.selected : ""}`}
                >
                  {m.users?.nickname || "익명"}
                </button>
              ))}
            </div>
          </div>

          {/* 참여자 선택 */}
          <div className={styles.section}>
            <p className={styles.label}>참여자</p>
            <div className={styles.memberList}>
              {members.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => toggleMember(m.user_id)}
                  className={`${styles.memberBtn} ${selectedMembers.includes(m.user_id) ? styles.selected : ""}`}
                >
                  {m.users?.nickname || "익명"}
                </button>
              ))}
            </div>
          </div>

          {/* 1인당 금액 미리보기 */}
          {totalAmount && selectedMembers.length > 0 && (
            <p className={styles.preview}>
              1인당{" "}
              {Math.floor(
                Number(totalAmount) / selectedMembers.length,
              ).toLocaleString()}
              원
            </p>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={styles.button}
          >
            {loading ? "추가 중..." : "정산 추가"}
          </button>
        </div>
      </div>
    </main>
  );
}
