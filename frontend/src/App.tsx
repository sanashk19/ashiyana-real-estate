import { createBrowserRouter, RouterProvider } from "react-router";
import HomePage from "./pages/Home";
import PropertiesPage from "./pages/Properties";

const router = createBrowserRouter([
  { path: "/", Component: HomePage },
  { path: "/properties", Component: PropertiesPage },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
