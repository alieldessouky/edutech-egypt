'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  return (
    <div style={{ backgroundColor: '#fff' }}>
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <HowItWorksSection />
      <AccessibilitySection />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '92vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(170deg, #f8faff 0%, #eef3ff 40%, #fff 100%)',
      }}
    >
      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(26,86,219,0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      {/* Accent shapes */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,86,219,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,160,52,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '120px 24px 80px',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: '#f0f5ff',
              border: '1px solid #dbe8ff',
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              color: '#1a56db',
              marginBottom: 28,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#1a56db' }} />
            Built for the Egyptian Curriculum
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: '#0f172a',
              margin: '0 0 20px',
            }}
          >
            Smarter learning,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              tailored
            </span>{' '}
            to every student
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: 'clamp(17px, 2vw, 20px)',
              lineHeight: 1.6,
              color: '#475569',
              margin: '0 0 36px',
              maxWidth: 560,
            }}
          >
            AI-powered quizzes that adapt to each student&apos;s level. Built for Egyptian schools
            with full Arabic support and accessibility for every learner.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link
              href="/student"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#1a56db',
                padding: '14px 28px',
                borderRadius: 10,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
              }}
            >
              Join as Student
              <span style={{ fontSize: 18 }}>&rarr;</span>
            </Link>
            <Link
              href="/teacher"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                color: '#1a56db',
                backgroundColor: '#fff',
                padding: '14px 28px',
                borderRadius: 10,
                border: '1.5px solid #dbe8ff',
                transition: 'all 0.2s ease',
              }}
            >
              Teacher Portal
            </Link>
          </div>
        </div>

        {/* Right side illustration — abstract card stack */}
        <div
          className="hero-visual"
          style={{
            position: 'absolute',
            right: 40,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 380,
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.3s',
          }}
        >
          <DemoCard delay={0} y={0} label="Adaptive Quiz" icon="Q" accent="#1a56db" />
          <DemoCard delay={100} y={90} label="AI Tutor Chat" icon="AI" accent="#7c3aed" />
          <DemoCard delay={200} y={180} label="Progress Tracking" icon="+" accent="#ea9f34" />
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .hero-visual { display: none !important; }
        }
      `}</style>
    </section>
  );
}

function DemoCard({
  delay,
  y,
  label,
  icon,
  accent,
}: {
  delay: number;
  y: number;
  label: string;
  icon: string;
  accent: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400 + delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: delay * 0.15,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: '18px 22px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: show ? 1 : 0,
        transform: show ? 'translateX(0)' : 'translateX(20px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          backgroundColor: `${accent}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 15,
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
          {label === 'Adaptive Quiz'
            ? 'Easy \u2192 Medium \u2192 Hard'
            : label === 'AI Tutor Chat'
              ? 'Ask anything, get help instantly'
              : 'Points, levels & achievements'}
        </div>
      </div>
    </div>
  );
}

/* ─── Trust Bar ─── */
function TrustBar() {
  return (
    <section
      style={{
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#fafbfd',
        padding: '28px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '32px',
        }}
      >
        <TrustStat value="K-12" label="Egyptian Curriculum" />
        <Dot />
        <TrustStat value="4" label="Question Types" />
        <Dot />
        <TrustStat value="RTL" label="Full Arabic Support" />
        <Dot />
        <TrustStat value="AI" label="Adaptive Learning" />
      </div>
    </section>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: '#1a56db', letterSpacing: -0.5 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Dot() {
  return (
    <div
      style={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        backgroundColor: '#d1d5db',
      }}
    />
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '96px 24px', backgroundColor: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader
          tag="Platform Features"
          title="Everything students and teachers need"
          description="A complete learning environment designed for the Egyptian education system, powered by AI."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginTop: 56,
          }}
        >
          <FeatureCard
            icon={<AdaptiveIcon />}
            title="Adaptive Difficulty"
            description="Quizzes that grow with the student. Start easy, progress to medium and hard as mastery is proven through 80% accuracy thresholds."
            accent="#1a56db"
          />
          <FeatureCard
            icon={<GameIcon />}
            title="Gamification"
            description="Points, levels, streaks, and achievements keep students motivated. Personal progress tracking without competitive pressure."
            accent="#ea9f34"
          />
          <FeatureCard
            icon={<AIIcon />}
            title="AI Tutor"
            description="An always-available tutor that understands the lesson context. Students can ask questions in Arabic and get clear, helpful explanations."
            accent="#7c3aed"
          />
          <FeatureCard
            icon={<QuizIcon />}
            title="Multiple Question Types"
            description="MCQ, True/False, Fill-in-the-Blank, and Matching questions. Each graded accurately with instant feedback."
            accent="#059669"
          />
          <FeatureCard
            icon={<TeacherIcon />}
            title="Teacher Dashboard"
            description="Generate quizzes from chapter content with AI. View student progress, attempt reviews, and identify focus areas at a glance."
            accent="#dc2626"
          />
          <FeatureCard
            icon={<VoiceIcon />}
            title="Voice & Audio"
            description="Text-to-speech in Egyptian Arabic. Students can listen to lessons and interact with the AI tutor using their voice."
            accent="#0891b2"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        backgroundColor: '#fff',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          backgroundColor: `${accent}0d`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          color: accent,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 8px',
          letterSpacing: -0.2,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: '#64748b', margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

/* ─── How It Works ─── */
function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: '96px 24px',
        backgroundColor: '#f8faff',
        borderTop: '1px solid #eef3ff',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader
          tag="How It Works"
          title="From classroom to mastery in four steps"
          description="A clear path designed for both students and teachers."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
            marginTop: 56,
          }}
        >
          <Step
            number="01"
            title="Teacher creates a class"
            description="Upload chapter content and the AI generates adaptive quizzes with multiple question types and difficulty levels."
          />
          <Step
            number="02"
            title="Students join with a link"
            description="No accounts needed for the MVP. Students join a class, see their lessons, and start learning immediately."
          />
          <Step
            number="03"
            title="Take adaptive quizzes"
            description="Questions adjust to each student's level. Instant feedback on every answer with points and achievement tracking."
          />
          <Step
            number="04"
            title="Track progress & grow"
            description="Students level up through Easy, Medium, and Hard. Teachers see detailed analytics and identify where students need help."
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          fontSize: 40,
          fontWeight: 800,
          color: '#e0e7ff',
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        {number}
      </div>
      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#0f172a',
          margin: 0,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: '#64748b', margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

/* ─── Accessibility ─── */
function AccessibilitySection() {
  return (
    <section
      id="accessibility"
      style={{
        padding: '96px 24px',
        backgroundColor: '#fff',
        borderTop: '1px solid #f1f5f9',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader
          tag="Accessibility"
          title="Designed for every student"
          description="No student should be left behind. The platform adapts to diverse learning needs."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginTop: 56,
          }}
        >
          <AccessibilityCard
            title="Screen Reader Support"
            description="Semantic HTML and ARIA labels ensure the platform works with assistive technology."
            icon="SR"
          />
          <AccessibilityCard
            title="RTL & Arabic First"
            description="Full right-to-left layout support. All content, quizzes, and the AI tutor work in Arabic."
            icon="\u0639"
          />
          <AccessibilityCard
            title="Voice Interaction"
            description="Students can listen to content and speak to the AI tutor. Reduces barriers for students with reading difficulties."
            icon="V"
          />
          <AccessibilityCard
            title="Adaptive Pacing"
            description="No time pressure. Students progress at their own speed. The system meets them where they are."
            icon="AP"
          />
        </div>
      </div>
    </section>
  );
}

function AccessibilityCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: '24px 28px',
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        backgroundColor: '#fafbfd',
        display: 'flex',
        gap: 18,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: '#eef3ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 14,
          color: '#1a56db',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 6px',
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#64748b', margin: 0 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section
      style={{
        padding: '80px 24px',
        background: 'linear-gradient(170deg, #1a56db 0%, #1e40af 100%)',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 16px',
            letterSpacing: -1,
            lineHeight: 1.15,
          }}
        >
          Ready to transform your classroom?
        </h2>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.8)',
            margin: '0 0 36px',
          }}
        >
          Start using adaptive AI-powered learning today. Free for Egyptian schools during our pilot program.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Link
            href="/student"
            style={{
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 600,
              color: '#1a56db',
              backgroundColor: '#fff',
              padding: '14px 32px',
              borderRadius: 10,
              transition: 'all 0.2s ease',
            }}
          >
            Join as Student
          </Link>
          <Link
            href="/teacher"
            style={{
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              padding: '14px 32px',
              borderRadius: 10,
              transition: 'all 0.2s ease',
            }}
          >
            Teacher Portal
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer
      style={{
        padding: '48px 24px 32px',
        backgroundColor: '#0f172a',
        borderTop: '1px solid #1e293b',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 32,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b82f6, #1a56db)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              E
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>
              EduTech Egypt
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
            AI-powered adaptive learning built for the Egyptian Ministry of Education curriculum.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <FooterColumn
            title="Platform"
            links={[
              { label: 'Student Portal', href: '/student' },
              { label: 'Teacher Portal', href: '/teacher' },
              { label: 'Lesson Studio', href: '/teacher/studio' },
            ]}
          />
          <FooterColumn
            title="Product"
            links={[
              { label: 'Features', href: '/#features' },
              { label: 'How It Works', href: '/#how-it-works' },
              { label: 'Accessibility', href: '/#accessibility' },
            ]}
          />
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '32px auto 0',
          paddingTop: 24,
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          &copy; {new Date().getFullYear()} EduTech Egypt. All rights reserved.
        </p>
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          Built for Egyptian students and teachers.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          margin: '0 0 14px',
        }}
      >
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              textDecoration: 'none',
              fontSize: 14,
              color: '#94a3b8',
              transition: 'color 0.2s ease',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Shared ─── */
function SectionHeader({
  tag,
  title,
  description,
}: {
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{ maxWidth: 580 }}>
      <div
        style={{
          display: 'inline-block',
          fontSize: 13,
          fontWeight: 600,
          color: '#1a56db',
          backgroundColor: '#f0f5ff',
          padding: '4px 12px',
          borderRadius: 6,
          marginBottom: 14,
        }}
      >
        {tag}
      </div>
      <h2
        style={{
          fontSize: 'clamp(28px, 3.5vw, 38px)',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 12px',
          letterSpacing: -0.8,
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: '#64748b', margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

/* ─── Icons (inline SVG) ─── */
function AdaptiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20" />
      <path d="M5 20V10l4-6" />
      <path d="M9 20V4" />
      <path d="M13 20V10l4-6" />
      <path d="M17 20V4" />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
