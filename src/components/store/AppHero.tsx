export function AppHero({
  kicker,
  title,
  description,
  aside,
  className = ""
}: Readonly<{
  kicker: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section className={`app-hero ${className}`.trim()}>
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside}
    </section>
  );
}
