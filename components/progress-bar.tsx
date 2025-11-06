"use client";

import NextTopLoader from "nextjs-toploader";

export function ProgressBar() {
  return (
    <NextTopLoader
      color="#000000"
      height={2}
      showSpinner={false}
      easing="ease"
      speed={200}
    />
  );
}
