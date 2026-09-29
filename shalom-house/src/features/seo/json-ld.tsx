export function JsonLd({ id, data }: { id: string; data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
