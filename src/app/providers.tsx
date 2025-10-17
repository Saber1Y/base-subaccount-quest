"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client for react-query (needed for Zora SDK)
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
