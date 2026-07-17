"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./settlement.module.css";

export default function SettlementPage({ params }) {
  const { id } = use(params);
  const [settlements, setSettlements] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    setCurrentUser(user);

    const { data } = await supabase
      .from("settlements")
      .select(
        `
        *,
        payer:users!settlements_created_by_fkey(nickname),
        settlement_members(
          user_id,
          amount,
          is_paid,
          is_requested,
          users(nickname)
        )
      `,
      )
      .eq("room_id", id)
      .order("created_at", { ascending: false });

    setSettlements(data || []);
    setLoading(false);
  };

  //송금자: "보냈어요" 버튼
  const requestPaid = async (settlementId, userId, current) => {
    const supabase = createClient();
    await supabase
      .from("settlement_members")
      .update({ is_requested: !current })
      .eq("settlement_id", settlementId)
      .eq("user_id", userId);
    fetchSettlements();
  };

  //결제자: "확인완료" 버튼
  const confirmPaid = async (settlementId, userId) => {
    const supabase = createClient();
    await supabase
      .from("settlement_members")
      .update({ is_paid: true })
      .eq("settlement_id", settlementId)
      .eq("user_id", userId);
    fetchSettlements();
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              onClick={() => router.push(`/room/${id}`)}
              className={styles.backButton}
            >
              ←
            </button>
            <h1 className={styles.title}>정산</h1>
          </div>
          <Link
            href={`/room/${id}/settlement/new`}
            className={styles.addButton}
          >
            + 추가
          </Link>
        </div>

        {settlements.length === 0 ? (
          <p className={styles.empty}>정산 내역이 없어요.</p>
        ) : (
          settlements.map((s) => {
            const isPayor = s.created_by === currentUser?.id; //내가 결제자인지
            const myMember = s.settlement_members?.find(
              (m) => m.user_id === currentUser?.id,
            );
            //결제자가 받아야 할 총액
            const totalReceive = s.settlement_members
              ?.filter((m) => m.user_id !== s.created_by && !m.is_paid)
              .reduce((sum, m) => sum + m.amount, 0);

            return (
              <div key={s.id} className={styles.settlementCard}>
                <div className={styles.settlementHeader}>
                  <p className={styles.settlementTitle}>{s.title}</p>
                  <p className={styles.settlementAmount}>
                    {s.total_amount.toLocaleString()}원
                  </p>
                </div>
                <p className={styles.settlementDate}>
                  {s.date} · 결제자: {s.payer?.nickname || "익명"}
                </p>

                {isPayor ? (
                  //내가 결제자일 때
                  <div className={styles.section}>
                    <p className={styles.sectionLabel}>
                      받아야 할 금액:{" "}
                      <span className={styles.highlight}>
                        {totalReceive?.toLocaleString()}원
                      </span>
                    </p>
                    <div className={styles.memberList}>
                      {s.settlement_members
                        ?.filter((m) => m.user_id !== s.created_by)
                        .map((m) => (
                          <div key={m.user_id} className={styles.memberRow}>
                            <span className={styles.memberName}>
                              {m.users?.nickname || "익명"}
                            </span>
                            <span className={styles.memberAmount}>
                              {m.amount.toLocaleString()}원
                            </span>
                            {m.is_paid ? (
                              //이미 확인완료
                              <span
                                className={`${styles.status} ${styles.paid}`}
                              >
                                완료
                              </span>
                            ) : m.is_requested ? (
                              //송금했다고 했을 때 → 확인완료 버튼
                              <button
                                onClick={() => confirmPaid(s.id, m.user_id)}
                                className={`${styles.paidBtn} ${styles.requested}`}
                              >
                                확인완료
                              </button>
                            ) : (
                              //아직 송금 안 함
                              <span
                                className={`${styles.status} ${styles.unpaid}`}
                              >
                                미송금
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  //내가 송금자일 때
                  <div className={styles.section}>
                    {myMember && (
                      <div className={styles.myRow}>
                        <p className={styles.sectionLabel}>
                          보내야 할 금액:{" "}
                          <span className={styles.highlight}>
                            {myMember.amount.toLocaleString()}원
                          </span>
                        </p>
                        {myMember.is_paid ? (
                          <span className={`${styles.status} ${styles.paid}`}>
                            완료
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              requestPaid(
                                s.id,
                                currentUser.id,
                                myMember.is_requested,
                              )
                            }
                            className={`${styles.paidBtn} ${myMember.is_requested ? styles.requested : ""}`}
                          >
                            {myMember.is_requested ? "송금취소" : "보냈어요"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
