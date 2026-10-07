import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { appModules } from "@/config/modules";
import PlaceholderPage from "@/shared/components/PlaceholderPage";
import AppLayout from "@/shared/layouts/AppLayout";
import ForbiddenPage from "@/shared/pages/ForbiddenPage";
import NotFoundPage from "@/shared/pages/NotFoundPage";
import ProtectedRoute from "@/modules/auth/components/ProtectedRoute";
import LoginPage from "@/modules/auth/pages/LoginPage";
import type { AppModule, PageLoader } from "@/shared/types/module";

function toRoute(path: string, label: string, page?: PageLoader): RouteObject {
  if (!page) {
    return { path, element: <PlaceholderPage title={label} /> };
  }
  return {
    path,
    lazy: async () => ({ Component: (await page()).default }),
  };
}

function moduleToRoute(module: AppModule): RouteObject {
  if (!module.sections) {
    return toRoute(module.basePath, module.label, module.page);
  }

  const items = module.sections.flatMap((section) => section.items);
  const childRoutes: RouteObject[] = [];

  if (items.length > 0) {
    childRoutes.push({ index: true, element: <Navigate to={items[0].path} replace /> });
  }

  for (const item of items) {
    childRoutes.push(toRoute(item.path, item.label, item.page));

    if (item.subRoutes) {
      for (const sub of item.subRoutes) {
        const fullSubPath = `${item.path}/${sub.path}`;
        childRoutes.push(toRoute(fullSubPath, sub.label, sub.page));
      }
    }
  }

  return {
    path: module.basePath,
    children: childRoutes,
  };
}

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout modules={appModules} />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      ...appModules.map(moduleToRoute),
      { path: "403", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);