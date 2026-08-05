import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "dokkaebitennis",
  brand: {
    displayName: "도깨비테니스",
    primaryColor: "#9ACE22",
    icon: "https://static.toss.im/appsintoss/67263/b71922cd-f9b3-4f98-85f0-7e45d3ef6e12.png",
  },
  web: {
    host: "0.0.0.0",
    port: 5173,
    commands: {
      dev: "vite dev --host 0.0.0.0",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
