"use client"; //브라우저에서 실행

import { useState } from "react"; //화면의 상태를 기억/변경
import { createClient } from "@/lib/supabase"; //로그인 및 DB 기능 가져오기
import { useRouter } from "next/navigation"; //다른 페이지 이동
import Link from "next/link"; //클릭해서 이동하는 링크 태그
import styles from "./login.module.css";

export default function LoginPage() {
  //입력 값 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); //뒤 부분에 기본값

  const router = useRouter(); // 페이지 이동할 때 씀/router.push('/주소') 형태

  const handleLogin = async () => {
    //비동기 처리
    setLoading(true); //버튼 비활성화
    setError(""); //이전 에러 초기화

    const supabase = createClient(); //supabase 연결 클라이언트 초기화

    //supabase에 email, password로 로그인 요청
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    //error처리
    if (error) {
      setError("이메일 또는 비밀번호 올바르게 입력해주세요");
      setLoading(false);
      return;
    }

    router.push("/"); //로그인 성공시 메인주소 "/"로 이동
  };

  //html 쓰는곳
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>MODAM</h1>
        <div className={styles.form}>
          <input
            type="email"
            placeholder="e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className={styles.button}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>
        <p className={styles.footer}>
          계정이 없으신가요?{" "}
          <Link href="/auth/signup" className={styles.link}>
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
