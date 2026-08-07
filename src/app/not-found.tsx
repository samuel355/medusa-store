import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{padding: '4rem', textAlign: 'center'}}>
      <h1 style={{fontSize: '2rem', marginBottom: '0.5rem'}}>404 — Page not found</h1>
      <p style={{color: '#6b7280', marginBottom: '1.25rem'}}>Sorry, we couldn't find the page you were looking for.</p>
      <div>
        <Link href="/" style={{color: '#de5f1c', fontWeight: 700}}>Return home</Link>
      </div>
    </main>
  );
}
