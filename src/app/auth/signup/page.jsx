"use client"; //브라우저에서 실행

import { useState } from "react"; //화면의 상태를 기억/변경
import { createClient } from "@/lib/supabase"; //로그인 및 DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import Link from "next/link"; //클릭해서 이동하는 링크 태그
import styles from "./signup.module.css";

export default function SignupPage() {
  //입력 값 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); //뒤 부분에 기본값

  const router = useRouter(); // 페이지 이동할 때 씀/router.push('/주소') 형태

  const handleSignup = async () => {
    //비동기 처리
    setLoading(true); //버튼 비활성화
    setError(""); //이전 에러 초기화

    const supabase = createClient(); //supabase 연결 클라이언트 초기화

    //Supabase에 회원가입 요청
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname }, //닉네임은 메타데이터로 저장
      },
    });

    //error처리
    if (error) {
      setError("회원가입에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.push("/"); //가입 성공 → 메인으로 이동
  };

  //html 쓰는곳
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>MODAM</h1>
        <p className={styles.subtitle}>소모임 날짜 조율 & 정산 서비스</p>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={styles.input}
          />
          <input
            type="email"
            placeholder="e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
          <input
            type="password"
            placeholder="password (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}

          <button
            onClick={handleSignup}
            disabled={loading}
            className={styles.button}
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </div>
        <p className={styles.footer}>
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className={styles.link}>
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
