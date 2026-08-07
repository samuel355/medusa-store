"use client";

import Link from "next/link";

export default function GlobalError({ error }: { error: Error }) {
  // Log error client-side
  console.error(error);

  return (
    <main style={{padding: '4rem', textAlign: 'center'}}>
      <h1 style={{fontSize: '2rem', marginBottom: '0.5rem'}}>Something went wrong</h1>
      <p style={{color: '#6b7280', marginBottom: '1.25rem'}}>An unexpected error occurred. Try refreshing the page or return home.</p>
      <div>
        <Link href="/" style={{color: '#de5f1c', fontWeight: 700}}>Return home</Link>
      </div>
    </main>
  );
}
