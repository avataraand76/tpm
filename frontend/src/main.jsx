import { createRoot } from "react-dom/client";
// Nạp font Roboto thật (self-host) để tránh trình duyệt tự làm đậm giả -> chữ bị dày mỏng không đều
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
