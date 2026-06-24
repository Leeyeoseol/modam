"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <main className="">
      <div className="">
        <h1 className="">MODAM</h1>
        <button onClick={handleLogout} className="">
          로그아웃
        </button>
      </div>
    </main>
  );
}
