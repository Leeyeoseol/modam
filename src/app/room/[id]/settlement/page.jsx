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
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

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

  //정산 합계 계산
  const calcSummary = () => {
    let toReceive = 0;
    let toSend = 0;

    settlements.forEach((s) => {
      const isPayor = s.created_by === currentUser?.id;
      if (isPayor) {
        s.settlement_members
          ?.filter((m) => m.user_id !== s.created_by && !m.is_paid)
          .forEach((m) => {
            toReceive += m.amount;
          });
      } else {
        const myMember = s.settlement_members?.find(
          (m) => m.user_id === currentUser?.id,
        );
        if (myMember && !myMember.is_paid) toSend += myMember.amount;
      }
    });

    return { toReceive, toSend };
  };

  //정산 수정
  const handleEdit = async (settlementId) => {
    if (!editTitle.trim() || !editAmount) return;

    const supabase = createClient();
    const amount = Number(editAmount);

    await supabase
      .from("settlements")
      .update({ title: editTitle, total_amount: amount })
      .eq("id", settlementId);

    const settlement = settlements.find((s) => s.id === settlementId);
    const memberCount = settlement.settlement_members?.length || 1;
    const perPerson = Math.floor(amount / memberCount);

    await supabase
      .from("settlement_members")
      .update({ amount: perPerson })
      .eq("settlement_id", settlementId);

    setEditingId(null);
    fetchSettlements();
  };

  //정산 삭제
  const handleDelete = async (settlementId) => {
    if (!confirm("정산을 삭제할까요?")) return;

    const supabase = createClient();

    await supabase
      .from("settlement_members")
      .delete()
      .eq("settlement_id", settlementId);

    await supabase.from("settlements").delete().eq("id", settlementId);

    fetchSettlements();
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

        {/* 정산 합계 */}
        {settlements.length > 0 &&
          (() => {
            const { toReceive, toSend } = calcSummary();
            return (
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <p className={styles.summaryLabel}>받아야 할 돈</p>
                  <p className={styles.summaryAmount}>
                    {toReceive.toLocaleString()}원
                  </p>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryItem}>
                  <p className={styles.summaryLabel}>보내야 할 돈</p>
                  <p className={styles.summaryAmount}>
                    {toSend.toLocaleString()}원
                  </p>
                </div>
              </div>
            );
          })()}

        {settlements.length === 0 ? (
          <p className={styles.empty}>정산 내역이 없어요.</p>
        ) : (
          settlements.map((s) => {
            const isPayor = s.created_by === currentUser?.id;
            const myMember = s.settlement_members?.find(
              (m) => m.user_id === currentUser?.id,
            );
            const totalReceive = s.settlement_members
              ?.filter((m) => m.user_id !== s.created_by && !m.is_paid)
              .reduce((sum, m) => sum + m.amount, 0);
            const isEditing = editingId === s.id;

            return (
              <div key={s.id} className={styles.settlementCard}>
                <div className={styles.settlementHeader}>
                  {isEditing ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={styles.editInput}
                        placeholder="지출 항목"
                      />
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className={styles.editInput}
                        placeholder="총 금액"
                      />
                    </div>
                  ) : (
                    <p className={styles.settlementTitle}>{s.title}</p>
                  )}

                  <div className={styles.settlementRight}>
                    {!isEditing && (
                      <p className={styles.settlementAmount}>
                        {s.total_amount.toLocaleString()}원
                      </p>
                    )}
                    {s.created_by === currentUser?.id && (
                      <div className={styles.actionBtns}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleEdit(s.id)}
                              className={styles.saveBtn}
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={styles.cancelBtn}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(s.id);
                                setEditTitle(s.title);
                                setEditAmount(String(s.total_amount));
                              }}
                              className={styles.editBtn}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className={styles.deleteBtn}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <>
                    <p className={styles.settlementDate}>
                      {s.date} · 결제자: {s.payer?.nickname || "익명"}
                    </p>

                    {isPayor ? (
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
                                  <span
                                    className={`${styles.status} ${styles.paid}`}
                                  >
                                    완료
                                  </span>
                                ) : m.is_requested ? (
                                  <button
                                    onClick={() => confirmPaid(s.id, m.user_id)}
                                    className={`${styles.paidBtn} ${styles.requested}`}
                                  >
                                    확인완료
                                  </button>
                                ) : (
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
                              <span
                                className={`${styles.status} ${styles.paid}`}
                              >
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
                                {myMember.is_requested
                                  ? "송금취소"
                                  : "보냈어요"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
