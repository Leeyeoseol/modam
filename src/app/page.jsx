"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <main>
      <div>
        <h1>MODAM</h1>
        <Link href="/room/create">방 만들기</Link>
        <button onClick={handleLogout}>로그아웃</button>
      </div>
    </main>
  );
}
