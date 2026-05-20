'use client';

import { useEffect, useRef, useState } from 'react';

export function HomepageClient() {
  const navRef = useRef<HTMLElement>(null);
  const [tabIdx, setTabIdx] = useState(0);
  const [rsvpPct, setRsvpPct] = useState(76);
  const tabs = ['overview', 'seating', 'messages'];
  const tabLabels = ['סקירה', 'סידור', 'הודעות'];

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    }, 1200);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTabIdx((i) => (i + 1) % 3);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRsvpPct(74 + Math.round(Math.random() * 6));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  function burst(x: number, y: number) {
    const colors = ['#D23CC2', '#A78BFA', '#FFBCAD', '#FFE08A', '#B7E4C7'];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;width:10px;height:10px;pointer-events:none;z-index:999;border-radius:2px;background:${colors[i % colors.length]};left:${x}px;top:${y}px;`;
      if (i % 3 === 0) { el.style.borderRadius = '999px'; el.style.width = '8px'; el.style.height = '8px'; }
      else if (i % 3 === 2) { el.style.clipPath = 'polygon(50% 0, 100% 100%, 0 100%)'; el.style.width = '10px'; el.style.height = '10px'; }
      document.body.appendChild(el);
      const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
      const dist = 80 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;
      const rot = Math.random() * 720 - 360;
      el.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: '1' },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: '0' },
        ],
        { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' }
      ).onfinish = () => el.remove();
    }
  }

  function handleCtaClick(e: React.MouseEvent<HTMLElement>) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }

  const selectedTable = tabIdx === 1 ? 7 : tabIdx === 2 ? 2 : 4;

  return (
    <>
      <style>{`
        :root {
          --bg: #FAFAFA; --card: #FFFFFF; --ink: #1A0B2E; --ink-2: #4B3A63; --ink-3: #8A7AA0;
          --line: rgba(26,11,46,0.08); --line-2: rgba(26,11,46,0.04);
          --primary: #D23CC2; --primary-deep: #B92AAB;
          --lavender: #A78BFA; --peach: #FFBCAD; --mint: #B7E4C7; --sun: #FFE08A;
          --grad-soft: linear-gradient(135deg,#FFE7F8 0%,#F1E8FF 45%,#FFE6DC 100%);
          --grad-bold: linear-gradient(120deg,#D23CC2 0%,#A78BFA 55%,#FFBCAD 100%);
          --grad-banner: radial-gradient(120% 140% at 0% 0%,#D23CC2 0%,#B53FD0 30%,#8B6BE8 65%,#FFBCAD 100%);
          --shadow-sm: 0 1px 2px rgba(26,11,46,0.04),0 2px 8px rgba(26,11,46,0.04);
          --shadow-md: 0 8px 24px rgba(26,11,46,0.06),0 2px 6px rgba(26,11,46,0.04);
          --shadow-lg: 0 24px 60px rgba(26,11,46,0.10),0 8px 16px rgba(26,11,46,0.05);
          --shadow-glow: 0 30px 80px rgba(210,60,194,0.25),0 8px 24px rgba(167,139,250,0.18);
          --r-sm:12px; --r-md:18px; --r-lg:24px; --r-xl:32px;
        }
        *{box-sizing:border-box}
        body{font-family:var(--font-plus-jakarta),"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
        a{color:inherit;text-decoration:none}
        button{font:inherit;cursor:pointer;border:none;background:none;color:inherit}
        img{display:block;max-width:100%}
        .heb{font-family:var(--font-heebo),"Heebo","Plus Jakarta Sans",sans-serif;direction:rtl}
        .wrap{width:100%;max-width:1240px;margin:0 auto;padding:0 28px}

        .hp-nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(250,250,250,0.72);border-bottom:1px solid transparent;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}
        .hp-nav.scrolled{border-bottom-color:var(--line);background:rgba(250,250,250,0.88);box-shadow:0 1px 0 rgba(26,11,46,0.02)}
        .nav-inner{height:76px;display:flex;align-items:center;justify-content:space-between;gap:24px}
        .logo{display:flex;align-items:center;height:100%}
        .logo img{height:48px;width:auto;display:block}
        .footer .logo img{height:44px}
        .nav-links{display:flex;align-items:center;gap:4px}
        .nav-links a{padding:10px 16px;border-radius:999px;font-weight:500;color:var(--ink-2);font-size:15px;transition:color .15s ease,background .15s ease}
        .nav-links a:hover{color:var(--ink);background:rgba(26,11,46,0.04)}

        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:14px;font-weight:700;font-size:15px;line-height:1;transition:transform .15s ease,box-shadow .2s ease,background .2s ease,color .2s ease,border-color .2s ease;white-space:nowrap;cursor:pointer}
        .btn-primary{background:var(--primary);color:#fff;box-shadow:0 6px 16px rgba(210,60,194,0.28),inset 0 -2px 0 rgba(0,0,0,0.08)}
        .btn-primary:hover{background:var(--primary-deep);transform:translateY(-1px);box-shadow:0 10px 22px rgba(210,60,194,0.35),inset 0 -2px 0 rgba(0,0,0,0.08)}
        .btn-ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line)}
        .btn-ghost:hover{border-color:rgba(26,11,46,0.18);transform:translateY(-1px);box-shadow:var(--shadow-sm)}
        .btn-lg{padding:16px 28px;font-size:16px;border-radius:16px}

        .hero{position:relative;padding:64px 0 96px;overflow:hidden}
        .hero::before{content:"";position:absolute;inset:-20% -10% 30% -10%;background:var(--grad-soft);filter:blur(40px);z-index:-2;border-radius:50%;opacity:.9}
        .hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:56px;align-items:center}
        .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;background:#fff;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:600;color:var(--ink-2);box-shadow:var(--shadow-sm)}
        .badge .dot{width:22px;height:22px;border-radius:999px;background:var(--grad-bold);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px}
        h1.hero-title{font-size:clamp(40px,5.4vw,68px);line-height:1.02;letter-spacing:-0.025em;font-weight:800;margin:20px 0 22px;color:var(--ink);text-wrap:balance}
        h1.hero-title .grad{background:linear-gradient(100deg,#D23CC2 0%,#A78BFA 60%,#FFBCAD 100%);-webkit-background-clip:text;background-clip:text;color:transparent;position:relative}
        .hero-sub{font-size:18px;line-height:1.55;color:var(--ink-2);max-width:520px;margin:0 0 32px;text-wrap:pretty}
        .hero-cta{display:flex;gap:12px;flex-wrap:wrap}
        .hero-meta{display:flex;align-items:center;gap:18px;margin-top:32px;color:var(--ink-3);font-size:13px;font-weight:500}
        .avatar-stack{display:flex}
        .avatar-stack .av{width:32px;height:32px;border-radius:999px;border:2px solid #FAFAFA;margin-right:-10px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700}
        .hero-decor{position:absolute;inset:0;pointer-events:none;z-index:-1}
        .mockup-wrap{position:relative;aspect-ratio:1.04/1;min-height:520px}
        .mockup{position:absolute;inset:0;background:#fff;border-radius:28px;border:1px solid var(--line);box-shadow:var(--shadow-glow);overflow:hidden;transform:perspective(1600px) rotateY(-5deg) rotateX(2deg);transform-origin:center}
        .mockup-top{height:44px;display:flex;align-items:center;gap:8px;padding:0 16px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#FCFAFE 0%,#FFFFFF 100%)}
        .mockup-top .lights{display:flex;gap:6px}
        .mockup-top .lights span{width:10px;height:10px;border-radius:999px}
        .mockup-tabs{display:flex;gap:4px;margin-left:16px;background:rgba(26,11,46,0.04);padding:4px;border-radius:10px}
        .mockup-tabs button{padding:5px 10px;font-size:11px;font-weight:600;color:var(--ink-3);border-radius:7px;transition:all .2s ease}
        .mockup-tabs button.active{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(26,11,46,0.08)}
        .mockup-body{padding:22px;height:calc(100% - 44px);display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto 1fr;gap:16px;background:radial-gradient(120% 120% at 100% 0%,rgba(167,139,250,0.06) 0%,transparent 50%),radial-gradient(120% 120% at 0% 100%,rgba(210,60,194,0.05) 0%,transparent 50%),#fff}
        .mk-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;position:relative}
        .mk-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink-3);font-weight:700;margin-bottom:6px}
        .mk-title{font-size:14px;font-weight:700;color:var(--ink)}
        .mk-sub{font-size:11px;color:var(--ink-3);margin-top:2px}
        .mk-hero{grid-column:1/-1;background:linear-gradient(120deg,#FFEAF8 0%,#EEE3FF 60%,#FFE6DC 100%);border:1px solid rgba(210,60,194,0.12);padding:16px 18px;display:flex;align-items:center;justify-content:space-between;overflow:hidden;position:relative}
        .mk-hero .left{z-index:1}
        .mk-hero h4{margin:0;font-size:17px;font-weight:800;letter-spacing:-0.01em}
        .mk-hero .meta{display:flex;gap:10px;margin-top:6px;font-size:11px;color:var(--ink-2);font-weight:600}
        .mk-hero .meta span{display:inline-flex;align-items:center;gap:4px}
        .mk-hero .meta i{width:6px;height:6px;border-radius:999px;background:var(--primary);display:inline-block}
        .mk-hero .countdown{display:flex;gap:6px;z-index:1}
        .mk-hero .countdown .pill{background:#fff;border-radius:10px;padding:6px 10px;min-width:38px;text-align:center;box-shadow:0 2px 6px rgba(26,11,46,0.06)}
        .mk-hero .countdown .num{font-size:16px;font-weight:800;letter-spacing:-0.02em}
        .mk-hero .countdown .lbl{font-size:8px;text-transform:uppercase;color:var(--ink-3);font-weight:700;letter-spacing:0.06em}
        .rsvp-row{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
        .rsvp-row .num{font-size:22px;font-weight:800;letter-spacing:-0.02em}
        .rsvp-bar{height:8px;border-radius:999px;background:rgba(167,139,250,0.15);overflow:hidden;margin-top:10px;position:relative}
        .rsvp-bar>i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#D23CC2 0%,#A78BFA 100%);border-radius:999px;transition:width .8s ease}
        .rsvp-legend{display:flex;gap:12px;margin-top:10px;font-size:10px;color:var(--ink-2);font-weight:600}
        .rsvp-legend i{width:8px;height:8px;border-radius:3px;display:inline-block;margin-right:4px;vertical-align:middle}
        .guests{display:flex;flex-direction:column;gap:8px;margin-top:10px}
        .guest{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:rgba(26,11,46,0.025)}
        .guest .av{width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}
        .guest .nm{font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .guest .tag{font-size:9px;font-weight:700;padding:3px 8px;border-radius:999px}
        .tag-ok{background:rgba(183,228,199,0.45);color:#1F6B3A}
        .tag-wait{background:rgba(255,224,138,0.5);color:#7A5300}
        .tag-no{background:rgba(255,188,173,0.5);color:#8C2E1B}
        .seating{grid-column:1/-1;background:linear-gradient(180deg,#FFFFFF 0%,#FCFAFE 100%)}
        .tables{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:12px}
        .table{aspect-ratio:1;border-radius:999px;background:rgba(26,11,46,0.04);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--ink-2);position:relative;transition:all .2s ease}
        .table.full{background:linear-gradient(135deg,#D23CC2,#A78BFA);color:#fff;box-shadow:0 4px 10px rgba(210,60,194,0.25)}
        .table.partial{background:rgba(255,188,173,0.5);color:#8C2E1B}
        .table.selected{background:#fff;border:2px solid var(--primary);color:var(--primary);box-shadow:0 0 0 4px rgba(210,60,194,0.12),0 4px 10px rgba(210,60,194,0.18);transform:scale(1.05)}
        .wa-bubble{position:absolute;right:-28px;bottom:56px;background:#fff;border-radius:16px;box-shadow:var(--shadow-lg);padding:12px 14px;width:240px;border:1px solid var(--line);z-index:2;animation:floaty 6s ease-in-out infinite}
        .wa-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .wa-icon{width:28px;height:28px;border-radius:8px;background:#25D366;display:inline-flex;align-items:center;justify-content:center;color:#fff}
        .wa-name{font-size:12px;font-weight:700}
        .wa-time{font-size:10px;color:var(--ink-3);margin-left:auto}
        .wa-msg{font-size:12px;line-height:1.45;background:linear-gradient(135deg,#FFEAF8,#F1E8FF);padding:8px 10px;border-radius:12px 12px 12px 4px;color:var(--ink)}
        .wa-status{font-size:9px;color:#25D366;margin-top:6px;font-weight:700}
        .ai-chip{position:absolute;left:-24px;top:80px;background:#fff;border-radius:14px;box-shadow:var(--shadow-lg);padding:10px 14px;border:1px solid var(--line);z-index:2;display:flex;align-items:center;gap:10px;animation:floaty 7s ease-in-out -2s infinite}
        .ai-chip .spark{width:28px;height:28px;border-radius:8px;background:var(--grad-bold);display:inline-flex;align-items:center;justify-content:center;color:#fff}
        .ai-chip .ai-t{font-size:12px;font-weight:700}
        .ai-chip .ai-s{font-size:10px;color:var(--ink-3)}
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

        .section{padding:96px 0;position:relative}
        .section-head{text-align:center;margin-bottom:56px}
        .eyebrow{display:inline-block;font-size:12px;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;color:var(--primary);margin-bottom:14px}
        h2.section-title{font-size:clamp(32px,3.6vw,48px);line-height:1.05;letter-spacing:-0.022em;font-weight:800;margin:0 0 14px;text-wrap:balance}
        .section-sub{font-size:17px;color:var(--ink-2);max-width:580px;margin:0 auto;line-height:1.55}
        .features{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
        .feature{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:28px 24px 30px;position:relative;overflow:hidden;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
        .feature::after{content:"";position:absolute;inset:-40% -40% auto auto;width:160px;height:160px;background:var(--grad-soft);border-radius:50%;filter:blur(20px);opacity:0;transition:opacity .3s ease;z-index:0}
        .feature:hover{transform:translateY(-4px);box-shadow:var(--shadow-md);border-color:rgba(210,60,194,0.18)}
        .feature:hover::after{opacity:1}
        .feature>*{position:relative;z-index:1}
        .f-icon{width:52px;height:52px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:18px;color:#fff}
        .f-icon.magenta{background:linear-gradient(135deg,#D23CC2,#B92AAB);box-shadow:0 6px 16px rgba(210,60,194,0.28)}
        .f-icon.green{background:linear-gradient(135deg,#25D366,#1FB358);box-shadow:0 6px 16px rgba(37,211,102,0.28)}
        .f-icon.lavender{background:linear-gradient(135deg,#A78BFA,#7F5AF0);box-shadow:0 6px 16px rgba(167,139,250,0.28)}
        .f-icon.peach{background:linear-gradient(135deg,#FFBCAD,#FF8E73);color:#5a1b0c;box-shadow:0 6px 16px rgba(255,142,115,0.28)}
        .f-title{font-size:19px;font-weight:700;letter-spacing:-0.01em;margin-bottom:6px}
        .f-text{font-size:14.5px;color:var(--ink-2);line-height:1.5;margin:0}
        .how{background:linear-gradient(180deg,#FAFAFA 0%,#FFFFFF 100%);position:relative}
        .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;position:relative}
        .step{background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:36px 28px 32px;text-align:center;position:relative;transition:transform .25s ease,box-shadow .25s ease}
        .step:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
        .step-num{width:76px;height:76px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;margin:0 auto 22px;position:relative;letter-spacing:-0.02em}
        .step-num::after{content:"";position:absolute;inset:-10px;border-radius:999px;border:1.5px dashed rgba(210,60,194,0.3);animation:spin 30s linear infinite}
        .step:nth-child(odd) .step-num{background:linear-gradient(135deg,#D23CC2,#A78BFA);box-shadow:0 12px 28px rgba(210,60,194,0.28)}
        .step:nth-child(even) .step-num{background:linear-gradient(135deg,#A78BFA,#FFBCAD);box-shadow:0 12px 28px rgba(167,139,250,0.28)}
        @keyframes spin{to{transform:rotate(360deg)}}
        .step h3{font-size:20px;font-weight:700;margin:0 0 8px;letter-spacing:-0.01em}
        .step p{font-size:15px;color:var(--ink-2);line-height:1.55;margin:0}
        .connector{position:absolute;top:60px;left:0;right:0;height:32px;pointer-events:none;z-index:0}
        .pricing-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;align-items:stretch}
        .plan{position:relative;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:28px 24px 26px;display:flex;flex-direction:column;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;overflow:hidden}
        .plan:hover{transform:translateY(-4px);box-shadow:var(--shadow-md);border-color:rgba(26,11,46,0.14)}
        .plan-name{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-3);margin-bottom:6px}
        .plan-tagline{font-size:15px;color:var(--ink-2);margin:0 0 24px;line-height:1.4;min-height:42px}
        .plan-price{display:flex;align-items:baseline;gap:4px;margin-bottom:4px}
        .plan-price .cur{font-size:22px;font-weight:700;color:var(--ink-2);letter-spacing:-0.01em}
        .plan-price .amt{font-size:48px;font-weight:800;letter-spacing:-0.03em;color:var(--ink);line-height:1}
        .plan-per{font-size:13px;color:var(--ink-3);font-weight:500;margin-bottom:22px}
        .plan-meta{display:flex;flex-direction:column;gap:10px;padding:16px 0;border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2);margin-bottom:22px}
        .plan-meta .row{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink)}
        .plan-meta .row .ic{width:26px;height:26px;border-radius:8px;background:rgba(167,139,250,0.12);color:var(--lavender);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
        .plan-meta .row b{font-weight:700}
        .plan-meta .row .reserve-ic{background:rgba(255,188,173,0.25);color:#c45a3e}
        .plan-cta{margin-top:auto;width:100%;padding:13px 18px;border-radius:12px;background:#fff;border:1.5px solid var(--line);color:var(--ink);font-weight:700;font-size:14.5px;transition:all .15s ease;cursor:pointer}
        .plan-cta:hover{border-color:var(--primary);color:var(--primary)}
        .plan.featured{background:linear-gradient(180deg,#FFFFFF 0%,#FDFAFF 100%);border-color:rgba(210,60,194,0.35);box-shadow:0 16px 40px rgba(210,60,194,0.12),0 4px 12px rgba(167,139,250,0.08);transform:translateY(-8px)}
        .plan.featured::before{content:"";position:absolute;inset:0 0 auto 0;height:5px;background:var(--grad-bold)}
        .plan.featured:hover{transform:translateY(-12px);box-shadow:0 24px 56px rgba(210,60,194,0.18),0 8px 16px rgba(167,139,250,0.1)}
        .plan.featured .plan-name{color:var(--primary)}
        .plan.featured .plan-cta{background:var(--primary);color:#fff;border-color:var(--primary);box-shadow:0 6px 16px rgba(210,60,194,0.28),inset 0 -2px 0 rgba(0,0,0,0.08)}
        .plan.featured .plan-cta:hover{background:var(--primary-deep);border-color:var(--primary-deep);transform:translateY(-1px);box-shadow:0 10px 22px rgba(210,60,194,0.35),inset 0 -2px 0 rgba(0,0,0,0.08)}
        .plan .pop-badge{position:absolute;top:18px;right:18px;background:var(--grad-bold);color:#fff;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:5px 10px;border-radius:999px;box-shadow:0 4px 10px rgba(210,60,194,0.3)}
        .pricing-incl{margin-top:40px;background:#fff;border:1px solid var(--line);border-radius:var(--r-lg);padding:24px 28px;display:flex;align-items:center;flex-wrap:wrap;gap:12px 28px}
        .pricing-incl .lbl{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary)}
        .pricing-incl .item{display:inline-flex;align-items:center;gap:8px;font-size:14.5px;color:var(--ink);font-weight:500}
        .pricing-incl .item svg{color:#25D366;flex-shrink:0}
        .pricing-foot{text-align:center;margin-top:28px;font-size:14px;color:var(--ink-3)}
        .pricing-foot a{color:var(--primary);font-weight:600}
        .pricing-foot a:hover{text-decoration:underline}
        .cta-banner{margin:24px 0 0;border-radius:var(--r-xl);background:var(--grad-banner);padding:80px 64px;color:#fff;text-align:center;position:relative;overflow:hidden;box-shadow:0 30px 80px rgba(210,60,194,0.25)}
        .cta-banner h2{font-size:clamp(34px,4vw,52px);font-weight:800;letter-spacing:-0.025em;line-height:1.05;margin:0 0 16px;text-wrap:balance}
        .cta-banner p{font-size:18px;opacity:.92;margin:0 auto 32px;max-width:560px;line-height:1.5}
        .cta-banner .btn{background:#fff;color:var(--ink);padding:16px 32px;font-size:16px;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,0.18)}
        .cta-banner .btn:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(0,0,0,0.22)}
        .footer{padding:64px 0 40px;border-top:1px solid var(--line);margin-top:96px}
        .footer-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
        .footer-links{display:flex;gap:28px}
        .footer-links a{font-size:14.5px;color:var(--ink-2);font-weight:500;transition:color .15s ease}
        .footer-links a:hover{color:var(--primary)}
        .footer-bottom{margin-top:32px;padding-top:24px;border-top:1px solid var(--line-2);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink-3)}
        .footer-bottom .made{display:inline-flex;align-items:center;gap:6px}
        .reveal{opacity:0;transform:translateY(16px);transition:opacity .7s ease,transform .7s ease}
        .reveal.in{opacity:1;transform:none}
        @media(max-width:1080px){
          .pricing-grid{grid-template-columns:repeat(2,1fr)}
          .plan.featured{transform:none}
          .plan.featured:hover{transform:translateY(-4px)}
          .hero-grid{grid-template-columns:1fr;gap:64px}
          .mockup-wrap{max-width:560px;margin:0 auto}
          .features{grid-template-columns:repeat(2,1fr)}
          .how-grid{grid-template-columns:1fr}
          .connector{display:none}
        }
        @media(max-width:720px){
          .nav-links{display:none}
          .section{padding:72px 0}
          .features{grid-template-columns:1fr}
          .cta-banner{padding:56px 28px}
          .footer-inner{flex-direction:column;align-items:flex-start}
          .wa-bubble{right:-8px;width:200px}
          .ai-chip{left:-8px}
        }
        @media(max-width:560px){
          .pricing-grid{grid-template-columns:1fr}
        }
      `}</style>

      {/* NAV */}
      <header className="hp-nav" ref={navRef} id="nav" dir="ltr">
        <div className="wrap nav-inner">
          <a href="#" className="logo" aria-label="Kululu home">
            <img src="/logo-navbar.png" alt="Kululu" />
          </a>
          <nav className="nav-links" aria-label="ניווט ראשי">
            <a href="#features">תכונות</a>
            <a href="#how">איך זה עובד</a>
            <a href="#pricing">תמחור</a>
          </nav>
          <button className="btn btn-primary heb" id="navCta" onClick={handleCtaClick}>
            התחילו עכשיו
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" dir="rtl">
        <svg className="hero-decor" viewBox="0 0 1440 800" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="bg1" cx="0.2" cy="0.2" r="0.6"><stop offset="0%" stopColor="#FFC8EE" stopOpacity="0.55"/><stop offset="100%" stopColor="#FFC8EE" stopOpacity="0"/></radialGradient>
            <radialGradient id="bg2" cx="0.9" cy="0.1" r="0.5"><stop offset="0%" stopColor="#D2C2FF" stopOpacity="0.55"/><stop offset="100%" stopColor="#D2C2FF" stopOpacity="0"/></radialGradient>
            <radialGradient id="bg3" cx="0.5" cy="0.9" r="0.6"><stop offset="0%" stopColor="#FFD8CB" stopOpacity="0.45"/><stop offset="100%" stopColor="#FFD8CB" stopOpacity="0"/></radialGradient>
          </defs>
          <circle cx="280" cy="180" r="320" fill="url(#bg1)"/>
          <circle cx="1280" cy="120" r="280" fill="url(#bg2)"/>
          <circle cx="780" cy="720" r="340" fill="url(#bg3)"/>
        </svg>
        <svg className="hero-decor" viewBox="0 0 1440 800" preserveAspectRatio="none" aria-hidden="true" style={{zIndex:-1}}>
          <circle cx="90" cy="380" r="42" fill="none" stroke="#D23CC2" strokeWidth="2" strokeDasharray="6 6" opacity="0.5"/>
          <circle cx="1350" cy="500" r="56" fill="none" stroke="#A78BFA" strokeWidth="2" strokeDasharray="4 8" opacity="0.5"/>
          <rect x="160" y="640" width="14" height="14" fill="#FFBCAD" transform="rotate(20 167 647)"/>
          <rect x="1240" y="250" width="12" height="12" fill="#D23CC2" transform="rotate(-15 1246 256)" opacity="0.7"/>
          <rect x="60" y="540" width="10" height="10" fill="#A78BFA" transform="rotate(35 65 545)"/>
          <polygon points="1320,640 1335,665 1305,665" fill="#FFE08A" opacity="0.9"/>
          <polygon points="120,160 132,180 108,180" fill="#A78BFA" opacity="0.7"/>
          <circle cx="1200" cy="60" r="8" fill="#FFBCAD"/>
          <circle cx="200" cy="100" r="6" fill="#D23CC2" opacity="0.6"/>
          <circle cx="1400" cy="380" r="5" fill="#A78BFA"/>
          <g transform="translate(1100, 200)" opacity="0.7"><path d="M0,-14 L3,-3 L14,0 L3,3 L0,14 L-3,3 L-14,0 L-3,-3 Z" fill="#D23CC2"/></g>
          <g transform="translate(180, 270)" opacity="0.6"><path d="M0,-10 L2,-2 L10,0 L2,2 L0,10 L-2,2 L-10,0 L-2,-2 Z" fill="#A78BFA"/></g>
        </svg>
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy reveal">
              <div className="badge">
                <span className="dot">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" fill="currentColor"/></svg>
                </span>
                חדש · סידור מושבים AI + תובנות חכמות על אורחים
              </div>
              <h1 className="hero-title">
                תכננו חתונה<br/>שמרגישה כמו <span className="grad">חגיגה</span>, לא כמו גיליון אלקטרוני.
              </h1>
              <p className="hero-sub">
                קולולו מאחד כל אורח, שולחן, אישור הגעה ותזכורת וואטסאפ למרחב עבודה אחד חם ושמח — כדי שתתמקדו ברגעים שחשובים.
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary btn-lg heb" onClick={handleCtaClick}>התחילו עכשיו</button>
                <a href="#how" className="btn btn-ghost btn-lg">
                  ראה איך זה עובד
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </div>
              <div className="hero-meta">
                <div className="avatar-stack">
                  <span className="av" style={{background:'#D23CC2'}}>מ</span>
                  <span className="av" style={{background:'#A78BFA'}}>ר</span>
                  <span className="av" style={{background:'#FFBCAD',color:'#5a1b0c'}}>ד</span>
                  <span className="av" style={{background:'#1A0B2E'}}>+</span>
                </div>
                <span>סומכים עלינו מעל 2,400 זוגות ומארגני אירועים</span>
              </div>
            </div>

            {/* MOCKUP */}
            <div className="mockup-wrap reveal">
              <div className="mockup">
                <div className="mockup-top">
                  <div className="lights">
                    <span style={{background:'#FFBCAD'}}/>
                    <span style={{background:'#FFE08A'}}/>
                    <span style={{background:'#B7E4C7'}}/>
                  </div>
                  <div className="mockup-tabs">
                    {tabs.map((t, i) => (
                      <button key={t} className={tabIdx === i ? 'active' : ''} onClick={() => setTabIdx(i)}>
                        {tabLabels[i]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mockup-body">
                  <div className="mk-card mk-hero">
                    <div className="left">
                      <h4>מאיה &amp; רועי · חתונה</h4>
                      <div className="meta">
                        <span><i/> שבת, 14 ביוני</span>
                        <span><i style={{background:'#A78BFA'}}/> האנגר 11, תל אביב</span>
                      </div>
                    </div>
                    <div className="countdown">
                      <div className="pill"><div className="num">42</div><div className="lbl">ימים</div></div>
                      <div className="pill"><div className="num">07</div><div className="lbl">שעות</div></div>
                      <div className="pill"><div className="num">28</div><div className="lbl">דקות</div></div>
                    </div>
                    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} aria-hidden="true">
                      <circle cx="92%" cy="20%" r="3" fill="#D23CC2" opacity="0.5"/>
                      <circle cx="86%" cy="78%" r="2.5" fill="#A78BFA" opacity="0.6"/>
                      <rect x="78%" y="44%" width="5" height="5" fill="#FFBCAD" opacity="0.7" transform="rotate(20 78 44)"/>
                    </svg>
                  </div>
                  <div className="mk-card">
                    <div className="mk-eyebrow">RSVP</div>
                    <div className="rsvp-row">
                      <div>
                        <div className="mk-title">אישורי הגעה</div>
                        <div className="mk-sub">186 מתוך 245 מוזמנים</div>
                      </div>
                      <div className="num">76<span style={{fontSize:13,color:'var(--ink-3)'}}>%</span></div>
                    </div>
                    <div className="rsvp-bar">
                      <i style={{width: rsvpPct + '%'}}/>
                    </div>
                    <div className="rsvp-legend">
                      <span><i style={{background:'#D23CC2'}}/> 142 כן</span>
                      <span><i style={{background:'#FFE08A'}}/> 28 אולי</span>
                      <span><i style={{background:'#FFBCAD'}}/> 16 לא</span>
                    </div>
                  </div>
                  <div className="mk-card">
                    <div className="mk-eyebrow">פעילות אחרונה</div>
                    <div className="guests">
                      <div className="guest">
                        <span className="av" style={{background:'#D23CC2'}}>א</span>
                        <span className="nm">עדי בר-און</span>
                        <span className="tag tag-ok">+2 אישרו</span>
                      </div>
                      <div className="guest">
                        <span className="av" style={{background:'#A78BFA'}}>נ</span>
                        <span className="nm">נועה כהן</span>
                        <span className="tag tag-wait">אולי</span>
                      </div>
                      <div className="guest">
                        <span className="av" style={{background:'#FFBCAD',color:'#5a1b0c'}}>י</span>
                        <span className="nm">יוסי לוי</span>
                        <span className="tag tag-ok">אישר</span>
                      </div>
                    </div>
                  </div>
                  <div className="mk-card seating">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div>
                        <div className="mk-eyebrow">תרשים מושבים</div>
                        <div className="mk-title">15 שולחנות · 168 מקומות הוצבו</div>
                      </div>
                      <div style={{display:'flex',gap:6,fontSize:10,color:'var(--ink-2)',fontWeight:600}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4}}><i style={{width:8,height:8,borderRadius:999,background:'linear-gradient(135deg,#D23CC2,#A78BFA)',display:'inline-block'}}/> מלא</span>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4}}><i style={{width:8,height:8,borderRadius:999,background:'rgba(255,188,173,0.7)',display:'inline-block'}}/> חלקי</span>
                      </div>
                    </div>
                    <div className="tables">
                      {[1,2,3,4,5,6,7,8,9,10].map((n, i) => {
                        const isSelected = i === selectedTable;
                        const isFull = [0,1,3,6,8].includes(i);
                        const isPartial = [2,5,9].includes(i);
                        return (
                          <div key={n} className={`table${isSelected?' selected':isFull?' full':isPartial?' partial':''}`}>{n}</div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp bubble */}
              <div className="wa-bubble">
                <div className="wa-head">
                  <span className="wa-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.555-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.512 5.26l.213.341-1.001 3.656 3.765-.956zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
                  </span>
                  <span className="wa-name">הפצת וואטסאפ</span>
                  <span className="wa-time">לפני 2 דקות</span>
                </div>
                <div className="wa-msg">היי עדי! ✨ תזכורת קצרה — החתונה של מאיה ורועי עוד 6 ימים. שמרו את המקום שלכם וענו כן לאישור.</div>
                <div className="wa-status">✓✓ נמסר ל-142 אורחים</div>
              </div>

              {/* AI chip */}
              <div className="ai-chip">
                <span className="spark">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg>
                </span>
                <div>
                  <div className="ai-t">AI הציע שולחן 5</div>
                  <div className="ai-s">חברים של הכלה, גילאים 28–34</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features" dir="rtl">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">כל מה שצריך</div>
            <h2 className="section-title">נבנה ליום החשוב ביותר.</h2>
            <p className="section-sub">מה-save the date הראשון ועד הריקוד האחרון — קולולו מחליף שישה גיליונות אלקטרוניים ושלוש קבוצות וואטסאפ במרחב עבודה אחד יפהפה.</p>
          </div>
          <div className="features">
            <div className="feature reveal">
              <div className="f-icon magenta">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div className="f-title">ניהול אורחים</div>
              <p className="f-text">עקבו אחר הזמנות, מלווים, דרישות תזונה ואישורי הגעה מרשימת אורחים אלגנטית אחת — עם תגיות חכמות וקיבוץ משפחתי.</p>
            </div>
            <div className="feature reveal">
              <div className="f-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.555-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.512 5.26l.213.341-1.001 3.656 3.765-.956z"/></svg>
              </div>
              <div className="f-title">הודעות וואטסאפ</div>
              <p className="f-text">שלחו הזמנות אישיות, תזכורות ותודות ישירות לוואטסאפ. תשובות דו-כיווניות מסונכרנות לפרופיל של כל אורח.</p>
            </div>
            <div className="feature reveal">
              <div className="f-icon lavender">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
              </div>
              <div className="f-title">תרשים מושבים</div>
              <p className="f-text">גררו שולחנות, הימנעו משכנים מביכים, וקבעו סידורים עם עורך ויזואלי שהאולם שלכם יאהב.</p>
            </div>
            <div className="feature reveal">
              <div className="f-icon peach">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg>
              </div>
              <div className="f-title">כלים חכמים AI</div>
              <p className="f-text">סידור מושבים אוטומטי לפי קשרים, כתיבת הודעות שמתאימות לסגנון שלכם, והצגת התזכורות הנכונות ברגע הנכון.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section how" id="how" dir="rtl">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">איך זה עובד</div>
            <h2 className="section-title">שלושה צעדים ליום ללא לחץ.</h2>
            <p className="section-sub">ללא עלויות הקמה, ללא מיגרציות, ללא סיוט גיליונות אלקטרוניים. רוב הזוגות שולחים הזמנות תוך 15 דקות.</p>
          </div>
          <div className="how-grid">
            <svg className="connector" viewBox="0 0 1200 32" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="connector" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#D23CC2"/>
                  <stop offset="50%" stopColor="#A78BFA"/>
                  <stop offset="100%" stopColor="#FFBCAD"/>
                </linearGradient>
              </defs>
              <path d="M 180 16 Q 400 -10 600 16 T 1020 16" fill="none" stroke="url(#connector)" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" opacity="0.6"/>
              <circle cx="280" cy="6" r="3" fill="#D23CC2" opacity="0.7"/>
              <circle cx="510" cy="22" r="2.5" fill="#A78BFA" opacity="0.6"/>
              <rect x="710" y="2" width="5" height="5" fill="#FFBCAD" transform="rotate(15 712 4)"/>
              <polygon points="930,18 938,28 922,28" fill="#FFE08A" opacity="0.8"/>
            </svg>
            <div className="step reveal">
              <div className="step-num">1</div>
              <h3>ייבוא האורחים שלכם</h3>
              <p>העלו CSV, הדביקו מ-Excel, או בנו את הרשימה שלכם בעורך שלנו. אנחנו מזהים אוטומטית שמות, טלפונים ומשקי בית.</p>
            </div>
            <div className="step reveal">
              <div className="step-num">2</div>
              <h3>שלחו הזמנות ואספו אישורים</h3>
              <p>הפצת וואטסאפ בלחיצה אחת ודפי הזמנה יפהפיים עושים את העבודה. התשובות זורמות לדשבורד שלכם בזמן אמת.</p>
            </div>
            <div className="step reveal">
              <div className="step-num">3</div>
              <h3>סדרו את כולם בדקות</h3>
              <p>גררו אורחים לשולחנות — או תנו ל-AI של קולולו להציע קיבוצים לפי מי מכיר את מי. הדפיסו, שתפו, סיימתם.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing" style={{paddingTop:64}} dir="rtl">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">תמחור</div>
            <h2 className="section-title">תשלום לפי אירוע. ללא הפתעות.</h2>
            <p className="section-sub">בחרו את התוכנית שמתאימה לרשימת האורחים שלכם. כל תוכנית כוללת מאגר חינמי של מקומות שמורים לתוספות של הרגע האחרון.</p>
          </div>
          <div className="pricing-grid">
            {/* Plan 1 */}
            <div className="plan reveal">
              <div className="plan-name">אינטימי</div>
              <p className="plan-tagline">חגיגות קטנות ומפגשים עם קרובים.</p>
              <div className="plan-price"><span className="cur">₪</span><span className="amt">190</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>100</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+10</b> שמורים · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={handleCtaClick}>בחרו אינטימי</button>
            </div>
            {/* Plan 2 Featured */}
            <div className="plan featured reveal">
              <span className="pop-badge">הכי פופולרי</span>
              <div className="plan-name">חגיגה</div>
              <p className="plan-tagline">המקום האידאלי לרוב החתונות ואירועים בינוניים.</p>
              <div className="plan-price"><span className="cur">₪</span><span className="amt">360</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>200</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+20</b> שמורים · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={handleCtaClick}>בחרו חגיגה</button>
            </div>
            {/* Plan 3 */}
            <div className="plan reveal">
              <div className="plan-name">גרנד</div>
              <p className="plan-tagline">חתונות גדולות, מסיבות יובל, כל הכפר.</p>
              <div className="plan-price"><span className="cur">₪</span><span className="amt">510</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>300</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+30</b> שמורים · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={handleCtaClick}>בחרו גרנד</button>
            </div>
            {/* Plan 4 */}
            <div className="plan reveal">
              <div className="plan-name">רויאל</div>
              <p className="plan-tagline">ליום המפואר שבו כולם מוזמנים.</p>
              <div className="plan-price"><span className="cur">₪</span><span className="amt">640</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>400</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+40</b> שמורים · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={handleCtaClick}>בחרו רויאל</button>
            </div>
          </div>
          <div className="pricing-incl reveal">
            <span className="lbl">כל תוכנית כוללת</span>
            {['ניהול אורחים','הודעות וואטסאפ','תרשים מושבים ויזואלי','כלים חכמים AI','שיתופי פעולה ללא הגבלה'].map((item) => (
              <span key={item} className="item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {item}
              </span>
            ))}
          </div>
          <p className="pricing-foot reveal">
            צריכים יותר מ-400 אורחים? <a href="#contact">דברו איתנו</a> — נתאים תוכנית במיוחד בשבילכם.
          </p>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="wrap" id="cta" dir="rtl">
        <div className="cta-banner reveal">
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} aria-hidden="true">
            <circle cx="8%" cy="22%" r="6" fill="#fff" opacity="0.3"/>
            <circle cx="92%" cy="14%" r="4" fill="#fff" opacity="0.4"/>
            <rect x="14%" y="78%" width="10" height="10" fill="#fff" opacity="0.25" transform="rotate(20 14 78)"/>
            <rect x="86%" y="68%" width="8" height="8" fill="#fff" opacity="0.3" transform="rotate(-15 86 68)"/>
            <circle cx="50%" cy="10%" r="60" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.18"/>
            <circle cx="6%" cy="88%" r="48" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.18"/>
            <g transform="translate(120, 80)" opacity="0.5"><path d="M0,-12 L2.5,-2.5 L12,0 L2.5,2.5 L0,12 L-2.5,2.5 L-12,0 L-2.5,-2.5 Z" fill="#fff"/></g>
            <g transform="translate(900, 220)" opacity="0.45"><path d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z" fill="#fff"/></g>
          </svg>
          <h2>החתונה שלכם ראויה למרחב עבודה יפה כמו היום עצמו.</h2>
          <p>התחילו בחינם. הזמינו את בן/בת הזוג, המתכנן שלכם, אפילו את החמות. שדרגו רק כשאתם מוכנים לשלוח.</p>
          <button className="btn heb" id="ctaBtn" onClick={handleCtaClick}>התחילו עכשיו</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer" dir="rtl">
        <div className="wrap">
          <div className="footer-inner">
            <a href="#" className="logo" aria-label="Kululu home">
              <img src="/logo-navbar.png" alt="Kululu" />
            </a>
            <div className="footer-links">
              <a href="#features">תכונות</a>
              <a href="#how">איך זה עובד</a>
              <a href="#pricing">תמחור</a>
              <a href="#contact">יצירת קשר</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
