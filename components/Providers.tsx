"use client";

import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthHydrator, ThemeSyncFromUser } from "@/components/AuthHydrator";
import { AccessibilitySync } from "@/components/AccessibilitySync";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthHydrator />
          <ThemeSyncFromUser />
          <AccessibilitySync />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}
