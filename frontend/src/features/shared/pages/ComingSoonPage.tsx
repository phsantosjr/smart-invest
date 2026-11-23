type ComingSoonPageProps = {
  title: string;
};

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <section className="rounded-lg bg-surface-container-low p-space-xl shadow-sm">
      <h1 className="font-headline text-lg font-semibold text-on-surface">{title}</h1>
      <p className="mt-space-sm text-sm text-on-surface-variant">Em breve.</p>
    </section>
  );
}