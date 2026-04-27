import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Local AI Chat</h1>
          <p className="text-gray-400 text-sm mt-1">
            Your private, local AI assistant
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-1">Sign in</h2>
          <p className="text-gray-400 text-sm mb-6">
            Sign in to save your conversations and preferences across sessions.
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl px-4 py-3 transition-colors"
            >
              {/* Google logo SVG */}
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-5">
            Your conversations are stored locally in your browser.
            <br />
            Google is used only for identity verification.
          </p>
        </div>
      </div>
    </div>
  );
}
