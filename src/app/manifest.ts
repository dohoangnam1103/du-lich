import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Địa Điểm Du Lịch",
    short_name: "Du Lịch",
    description: "Tìm quán ăn, cà phê và chỗ vui chơi quanh đây",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2fb",
    theme_color: "#4f7cff",
    lang: "vi",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
