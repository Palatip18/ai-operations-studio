import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in | AI Operations Studio",
};

export default async function LoginPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) redirect("/");
  return <LoginForm />;
}
