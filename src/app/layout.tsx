import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "KubeLearn - Master Kubernetes Interactively",
  description:
    "Learn Kubernetes through gamified certification paths, interactive quizzes, and hands-on labs. Prepare for CKA, CKAD, CKS, and KCNA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <Providers>
          <Navbar />
          <main className="min-h-screen pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
