import { notFound } from "next/navigation";

import HomeBenchmarkClient from "./HomeBenchmarkClient";

export default function HomeBenchmarkPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <HomeBenchmarkClient />;
}
