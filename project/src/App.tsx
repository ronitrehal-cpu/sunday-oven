import React, { useState } from 'react';
import { Instagram, Mail } from 'lucide-react';

function App() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }

    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#f3dac6] flex flex-col">
      {/* Subtle stripe pattern background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 20px,
            rgba(61, 10, 16, 0.04) 20px,
            rgba(61, 10, 16, 0.04) 24px,
            transparent 24px,
            transparent 80px,
            rgba(61, 10, 16, 0.08) 80px,
            rgba(61, 10, 16, 0.08) 88px
          )`
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 px-6 py-4 flex justify-between items-center">
        <div className="text-[#3d0a10] font-semibold text-sm tracking-wide">
          SUNDAY OVEN
        </div>
        <div className="flex gap-6 text-sm">
          <a
            href="https://www.instagram.com/bakesbysundayoven/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3d0a10] hover:opacity-70 transition-opacity flex items-center gap-1.5"
          >
            <Instagram size={16} />
            <span className="hidden sm:inline">Instagram</span>
          </a>
          <a
            href="mailto:hello@sundayoven.com"
            className="text-[#3d0a10] hover:opacity-70 transition-opacity flex items-center gap-1.5"
          >
            <Mail size={16} />
            <span className="hidden sm:inline">Contact</span>
          </a>
        </div>
      </header>

      {/* Hero section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div
          className={`w-full max-w-[720px] bg-[#3d0a10] text-[#f3dac6] rounded-3xl sm:rounded-[32px] p-8 sm:p-12 md:p-16 shadow-2xl transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8 sm:mb-10">
            <img
              src="/image.png"
              alt="Sunday Oven Logo"
              className="h-28 sm:h-36 md:h-40 w-auto object-contain"
              style={{ transform: 'scale(2.2)' }}
            />
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-4 sm:mb-5 leading-tight">
            Freshly baked cookies. Coming soon.
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-center mb-8 sm:mb-10 opacity-90 leading-relaxed">
            Small-batch, premium cookies — baked with care and delivered fresh.
          </p>

          {/* Email form or success state */}
          {!isSubmitted ? (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-center mb-4">
                Join the Oven List
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your email"
                    className="flex-1 px-5 py-3.5 rounded-xl bg-[#f3dac6] text-[#3d0a10] placeholder-[#3d0a10]/50 focus:outline-none focus:ring-2 focus:ring-[#f3dac6]/50 transition-all text-base"
                    aria-label="Email address"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-[#f3dac6] text-[#3d0a10] rounded-xl font-semibold sm:font-semibold font-bold hover:bg-[#f3dac6]/90 transition-all duration-200 transform hover:scale-[1.02] text-base whitespace-nowrap"
                  >
                    Notify me
                  </button>
                </div>

                {error && (
                  <p className="text-[#ff6b6b] text-sm text-center">{error}</p>
                )}
              </form>

              <p className="text-sm text-center opacity-75 pt-2">
                Early subscribers get first access + launch perks.
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl mb-4">🍪</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-3">
                You're on the list.
              </h2>
              <p className="text-base sm:text-lg opacity-90 mb-6">
                We'll email you first when Sunday Oven launches.
              </p>
              <a
                href="https://www.instagram.com/bakesbysundayoven/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#f3dac6] text-[#3d0a10] rounded-xl font-semibold hover:bg-[#f3dac6]/90 transition-all duration-200"
              >
                <Instagram size={18} />
                Follow on Instagram
              </a>
            </div>
          )}

          {/* Trust line */}
          <div className="text-center mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-[#f3dac6]/20 text-sm opacity-75">
            Made in Melbourne • New drops soon
          </div>
        </div>
      </main>

      {/* Social proof strip */}
      <section className="relative z-10 py-8 sm:py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-5 sm:gap-12 text-[#3d0a10]">
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium">
              <div className="w-2 h-2 bg-[#3d0a10] rounded-full" />
              Small-batch
            </div>
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium">
              <div className="w-2 h-2 bg-[#3d0a10] rounded-full" />
              Real ingredients
            </div>
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium">
              <div className="w-2 h-2 bg-[#3d0a10] rounded-full" />
              Freshly baked
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#f3dac6] px-6 py-6 border-t border-[#3d0a10]/10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[#3d0a10]/80 sm:text-[#3d0a10] text-sm">
          <div>
            © {new Date().getFullYear()} Sunday Oven
          </div>
          <div className="flex gap-6">
            <a
              href="https://www.instagram.com/bakesbysundayoven/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity flex items-center gap-1.5"
            >
              <Instagram size={14} />
              Instagram
            </a>
            <a
              href="mailto:hello@sundayoven.com"
              className="hover:opacity-70 transition-opacity"
            >
              hello@sundayoven.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
