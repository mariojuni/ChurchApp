import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFriendlyAuthError } from '../../utils/authErrors';
import { isAdminRole } from '../../utils/adminRoles';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Error copy constants
// ---------------------------------------------------------------------------
const ERROR_UNAUTHORIZED =
  'You do not have permission to access the admin portal. Please contact your church administrator.';
const ERROR_DISABLED =
  'Your account has been disabled. Please contact your church administrator.';
const ERROR_NO_CHURCH = 'Your account is not linked to a church yet.';

// ---------------------------------------------------------------------------
// Inline helper — run post-Firebase-Auth authorization check
// Returns { authorized: true } or { authorized: false, message: string }
// ---------------------------------------------------------------------------
async function checkAdminAuthorization(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { authorized: false, message: ERROR_UNAUTHORIZED };

  const data = snap.data();

  if (data.status === 'disabled') return { authorized: false, message: ERROR_DISABLED };
  if (data.status === 'pendingChurchLink') return { authorized: false, message: ERROR_NO_CHURCH };
  if (!isAdminRole(data.role)) return { authorized: false, message: ERROR_UNAUTHORIZED };
  if (data.role !== 'super_admin' && !data.churchId) {
    return { authorized: false, message: ERROR_NO_CHURCH };
  }

  return { authorized: true };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Login() {
  const { login, loginWithGoogle, logout, isAuthorizedAdmin, isLoading, sendPasswordReset } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirect if already authorized
  useEffect(() => {
    if (!isLoading && isAuthorizedAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isLoading, isAuthorizedAdmin, navigate]);

  // ------------------------------------------------------------------
  // Login submit
  // ------------------------------------------------------------------
  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const credential = await login(email, password);
      const uid = credential.user.uid;

      const result = await checkAdminAuthorization(uid);
      if (!result.authorized) {
        await logout();
        setError(result.message);
        return;
      }

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------
  // Google login
  // ------------------------------------------------------------------
  async function handleGoogleLogin() {
    setError('');
    setSubmitting(true);

    try {
      const credential = await loginWithGoogle();
      const uid = credential.user.uid;

      const result = await checkAdminAuthorization(uid);
      if (!result.authorized) {
        await logout();
        setError(result.message);
        return;
      }

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------
  // Forgot password submit
  // ------------------------------------------------------------------
  async function handleResetSubmit(e) {
    e.preventDefault();
    setResetError('');
    setResetSubmitting(true);

    try {
      await sendPasswordReset(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      setResetError(getFriendlyAuthError(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  function openForgotPassword() {
    setResetEmail(email); // prefill with whatever the user typed
    setResetSuccess(false);
    setResetError('');
    setForgotMode(true);
  }

  function closeForgotPassword() {
    setForgotMode(false);
    setResetSuccess(false);
    setResetError('');
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen flex bg-church-bg">
      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-church-green flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5" />

        {/* Brand mark */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-church-green font-bold text-lg">C</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">ChurchAdmin</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-snug">
            Empowering<br />church leaders<br />to serve better.
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Manage your ministry operations, members, events, giving records, and more — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {['Members', 'Attendance', 'Giving', 'Events', 'Reports'].map((f) => (
              <span
                key={f}
                className="px-3 py-1 bg-white/10 text-white/90 rounded-full text-sm font-medium border border-white/20"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <p className="relative z-10 text-white/40 text-sm">
          &ldquo;Serve one another humbly in love.&rdquo; — Galatians 5:13
        </p>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center space-x-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-church-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-church-navy font-bold text-lg">ChurchAdmin</span>
          </div>

          {/* ── Login form ── */}
          {!forgotMode && (
            <div className="bg-white rounded-2xl shadow-church-soft p-8 sm:p-10">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-church-navy tracking-tight">Welcome back</h2>
                <p className="text-church-slate text-sm mt-1 leading-relaxed">
                  Sign in to manage your church app and ministry operations.
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm leading-snug">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate>
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-church-navy">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Mail size={16} className="text-church-slate" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@church.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-church-navy placeholder-church-slate/60 focus:outline-none focus:ring-2 focus:ring-church-green/30 focus:border-church-green transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-church-navy">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-xs text-church-green hover:text-church-green-light font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Lock size={16} className="text-church-slate" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-church-navy placeholder-church-slate/60 focus:outline-none focus:ring-2 focus:ring-church-green/30 focus:border-church-green transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-church-slate hover:text-church-navy transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-church-green accent-church-green"
                  />
                  <span className="text-sm text-church-slate">Remember me</span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-church-green hover:bg-church-green-light text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-church-slate">or continue with</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google */}
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-church-navy font-medium py-2.5 px-4 rounded-xl transition-colors duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <g fill="none" fillRule="evenodd">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </g>
                </svg>
                Sign in with Google
              </button>

              {/* Footer */}
              <p className="text-center text-xs text-church-slate/70 mt-6 leading-relaxed">
                Secure access for authorized church leaders only.
              </p>
            </div>
          )}

          {/* ── Forgot password form ── */}
          {forgotMode && (
            <div className="bg-white rounded-2xl shadow-church-soft p-8 sm:p-10">
              {/* Back button */}
              <button
                type="button"
                onClick={closeForgotPassword}
                className="flex items-center gap-1.5 text-sm text-church-slate hover:text-church-navy mb-6 transition-colors"
              >
                <ArrowLeft size={15} />
                Back to sign in
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-church-navy tracking-tight">Reset password</h2>
                <p className="text-church-slate text-sm mt-1 leading-relaxed">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {/* Success state */}
              {resetSuccess ? (
                <div className="flex items-start gap-3 bg-green-50 border border-green-100 text-green-700 rounded-xl px-4 py-4 text-sm leading-snug">
                  <CheckCircle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Password reset link sent. Please check your email.
                  </span>
                </div>
              ) : (
                <>
                  {/* Reset error */}
                  {resetError && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm leading-snug">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleResetSubmit} className="space-y-5" noValidate>
                    <div className="space-y-1.5">
                      <label htmlFor="reset-email" className="block text-sm font-medium text-church-navy">
                        Email address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <Mail size={16} className="text-church-slate" />
                        </div>
                        <input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          required
                          placeholder="you@church.org"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-church-navy placeholder-church-slate/60 focus:outline-none focus:ring-2 focus:ring-church-green/30 focus:border-church-green transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-church-green hover:bg-church-green-light text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {resetSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending…
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
