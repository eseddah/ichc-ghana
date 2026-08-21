import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const denied = router.query.error === "AccessDenied";

  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaBoxRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/quiz");
    }
  }, [status, router]);

  // Render the reCAPTCHA widget once the script has loaded and the
  // sign-in panel (i.e. the target div) is actually in the DOM.
  useEffect(() => {
    if (!captchaReady || !captchaBoxRef.current || widgetIdRef.current !== null) return;
    if (!window.grecaptcha || !window.grecaptcha.render) return;
    widgetIdRef.current = window.grecaptcha.render(captchaBoxRef.current, {
      sitekey: RECAPTCHA_SITE_KEY,
      callback: (token) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(null),
      "error-callback": () => setCaptchaToken(null),
    });
  }, [captchaReady, status, denied]);

  return (
    <div className="wrap">
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setCaptchaReady(true)}
      />

      <div className="top">
        <div className="eyebrow">Outreach Program · Chemistry Track</div>
        <h1>Mole Concept & Stoichiometry — Assessment</h1>
        <p>
          50 tough questions · 1 hour 20 minute locked timer · sign in with the
          Google account your ambassador registered you with.
        </p>
      </div>

      <div className="panel">
        {status === "loading" && <p style={{ color: "var(--dim)" }}>Checking your session…</p>}

        {status !== "loading" && status !== "authenticated" && (
          <>
            {denied && (
              <div style={{ marginBottom: 16, color: "var(--danger)", fontSize: 13.5 }}>
                That Google account isn't registered for this assessment. Ask your
                ambassador to confirm the email they added for you.
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div ref={captchaBoxRef} />
              {!captchaReady && (
                <p style={{ color: "var(--dim)", fontSize: 12.5 }}>Loading verification…</p>
              )}
            </div>

            <button
              className="google-btn"
              onClick={() => signIn("google")}
              disabled={!captchaToken}
              title={!captchaToken ? "Please check the box to confirm you're not a robot" : undefined}
              style={!captchaToken ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6 29.3 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.5 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.8 39.6 16.4 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 36.1 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              Sign in with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
