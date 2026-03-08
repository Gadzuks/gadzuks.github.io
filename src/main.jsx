import React from "react";
import ReactDOM from "react-dom/client";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import App from "./App";
import "./index.css";

const isDev = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    {isDev && <DialRoot />}
  </React.StrictMode>
);
