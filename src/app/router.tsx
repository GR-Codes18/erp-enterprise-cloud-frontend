import { createBrowserRouter, Navigate, type RouteObject } from "react-router"
import { appModules } from "@/config/modules"
import PlaceholderPage from "@/shared/components/PlaceholderPage"
import AppLayout from "@/shared/layouts/AppLayout"
import NotFoundPage from "@/shared/pages/NotFoundPage"
import type { AppModule, PageLoader } from "@/shared/types/module"

function toRoute(path: string, label: string, page?: PageLoader): RouteObject {
  if (!page) {
    return { path, element: <PlaceholderPage title={label} /> }
  }
  return {
    path,
    lazy: async () => ({ Component: (await page()).default }),
  }
}

function moduleToRoute(module: AppModule): RouteObject {
  if (!module.sections) {
    return toRoute(module.basePath, module.label, module.page)
  }

  const items = module.sections.flatMap((section) => section.items)

  return {
    path: module.basePath,
    children: [
      { index: true, element: <Navigate to={items[0].path} replace /> },
      ...items.map((item) => toRoute(item.path, item.label, item.page)),
    ],
  }
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout modules={appModules} />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      ...appModules.map(moduleToRoute),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
