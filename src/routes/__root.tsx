import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import aaLogo from "../assets/aa-logo-optimized.png";
import pavoneFavicon from "../stores/pavone/public/assets/pavone-favicon.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Double A - Digital Engineering Studio" },
      { name: "description", content: "Double A - Digital Engineering Studio" },
      { property: "og:title", content: "Double A - Digital Engineering Studio" },
      { property: "og:description", content: "Double A - Digital Engineering Studio" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Double A - Digital Engineering Studio" },
      { name: "twitter:description", content: "Double A - Digital Engineering Studio" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: aaLogo,
      },
      {
        rel: "apple-touch-icon",
        href: aaLogo,
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    applySavedAaTheme();

    const favicon = pathname.startsWith("/stores/pavone") ? pavoneFavicon : aaLogo;

    setLinkTag("icon", favicon, "image/png");
    setLinkTag("apple-touch-icon", favicon);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}

function applySavedAaTheme() {
  if (typeof window === "undefined") return;

  const saved = window.localStorage.getItem("aa-theme");
  const theme = saved === "light" ? "light" : "dark";
  const root = document.documentElement;

  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

function setLinkTag(rel: string, href: string, type?: string) {
  if (typeof document === "undefined") return;

  const links = Array.from(document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`));
  let link = links[0];

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }

  links.slice(1).forEach((extraLink) => extraLink.remove());

  if (type) {
    link.type = type;
  } else {
    link.removeAttribute("type");
  }

  link.href = href;
}
