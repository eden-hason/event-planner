'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBrandWhatsapp } from '@tabler/icons-react';

const WHATSAPP_NUMBER = '972556839696';
const WHATSAPP_OPENING_MESSAGE = 'היי, אשמח לקבל פרטים נוספים על Kululu';

export function HomepageClient() {
  const navRef = useRef<HTMLElement>(null);
  const [tabIdx, setTabIdx] = useState(0);
  const [rsvpPct, setRsvpPct] = useState(76);
  const [activeSection, setActiveSection] = useState('');
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
    const sectionIds = ['features', 'how', 'pricing', 'faq'];
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
    return () => spy.disconnect();
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

  function handlePlanCtaClick(records: number) {
    const message = `היי, אשמח לשמוע עוד על החבילה של ${records} רשומות`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  }

  const selectedTable = tabIdx === 1 ? 7 : tabIdx === 2 ? 2 : 4;

  const [activeScene, setActiveScene] = useState<string>('guests');
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set([0]));

  function toggleFaq(i: number) {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

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
        body{font-family:var(--font-rubik),"Rubik",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
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
        .nav-links a{padding:10px 16px;border-radius:999px;font-weight:500;color:var(--ink-2);font-size:16px;transition:color .15s ease,background .15s ease}
        .nav-links a:hover,.nav-links a.active{color:var(--primary);background:rgba(210,60,194,0.10)}
        .nav-links a.active{font-weight:700}

        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:14px;font-weight:700;font-size:15px;line-height:1;transition:transform .15s ease,box-shadow .2s ease,background .2s ease,color .2s ease,border-color .2s ease;white-space:nowrap;cursor:pointer}
        .btn-primary{background:var(--primary);color:#fff;box-shadow:0 6px 16px rgba(210,60,194,0.28),inset 0 -2px 0 rgba(0,0,0,0.08)}
        .btn-primary:hover{background:var(--primary-deep);transform:translateY(-1px);box-shadow:0 10px 22px rgba(210,60,194,0.35),inset 0 -2px 0 rgba(0,0,0,0.08)}
        .btn-ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line)}
        .btn-ghost:hover{border-color:rgba(26,11,46,0.18);transform:translateY(-1px);box-shadow:var(--shadow-sm)}
        .btn-lg{padding:16px 28px;font-size:16px;border-radius:16px}

        .hero{position:relative;min-height:calc(100vh - 76px);display:flex;align-items:center;padding:64px 0;overflow:hidden}
        .hero .wrap{width:100%}
        .hero::before{content:"";position:absolute;inset:-20% -10% -10% -10%;background:var(--grad-soft);filter:blur(40px);z-index:-2;border-radius:50%;opacity:.9}
        .hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:56px;align-items:center}
        .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;background:#fff;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:600;color:var(--ink-2);box-shadow:var(--shadow-sm)}
        .badge .dot{width:22px;height:22px;border-radius:999px;background:var(--grad-bold);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px}
        h1.hero-title{font-size:clamp(40px,5.4vw,68px);line-height:1.02;letter-spacing:-0.025em;font-weight:400;margin:20px 0 22px;color:var(--ink);text-wrap:balance;font-family:var(--font-rubik),"Rubik",sans-serif}
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

        /* ===== DEEP DIVE / ACCORDION ===== */
        .deep{background:radial-gradient(60% 80% at 100% 0%,rgba(167,139,250,0.06) 0%,transparent 60%),radial-gradient(60% 80% at 0% 100%,rgba(210,60,194,0.05) 0%,transparent 60%),#FAFAFA}
        .deep-head{text-align:right;max-width:720px;margin-bottom:48px}
        .deep-grid{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:48px;align-items:stretch}
        .acc{display:flex;flex-direction:column;gap:12px}
        .acc-item{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:border-color .25s ease,box-shadow .25s ease}
        .acc-item.active{border-color:rgba(210,60,194,0.3);box-shadow:0 12px 32px rgba(210,60,194,0.08),0 2px 8px rgba(26,11,46,0.04)}
        .acc-trigger{width:100%;display:flex;align-items:center;gap:16px;padding:20px 22px;text-align:right;transition:background .15s ease}
        .acc-trigger:hover{background:rgba(26,11,46,0.02)}
        .acc-item.active .acc-trigger:hover{background:transparent}
        .acc-ic{width:40px;height:40px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:transform .3s cubic-bezier(.2,.7,.4,1)}
        .acc-item.active .acc-ic{transform:scale(1.08)}
        .acc-ic.magenta{background:linear-gradient(135deg,#D23CC2,#B92AAB);box-shadow:0 4px 12px rgba(210,60,194,0.28)}
        .acc-ic.green{background:linear-gradient(135deg,#25D366,#1FB358);box-shadow:0 4px 12px rgba(37,211,102,0.25)}
        .acc-ic.lavender{background:linear-gradient(135deg,#A78BFA,#7F5AF0);box-shadow:0 4px 12px rgba(167,139,250,0.28)}
        .acc-ic.peach{background:linear-gradient(135deg,#FFBCAD,#FF8E73);color:#5a1b0c;box-shadow:0 4px 12px rgba(255,142,115,0.28)}
        .acc-ic.sun{background:linear-gradient(135deg,#FFE08A,#FFB84D);color:#5a3a00;box-shadow:0 4px 12px rgba(255,184,77,0.25)}
        .acc-ic.blue{background:linear-gradient(135deg,#3B9EFF,#1A7FE8);box-shadow:0 4px 12px rgba(26,127,232,0.28)}
        .acc-title{flex:1;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:var(--ink)}
        .acc-chev{width:32px;height:32px;border-radius:999px;background:rgba(26,11,46,0.05);display:inline-flex;align-items:center;justify-content:center;color:var(--ink-2);flex-shrink:0;transition:transform .35s cubic-bezier(.2,.7,.4,1),background .2s ease,color .2s ease}
        .acc-item.active .acc-chev{background:var(--primary);color:#fff;transform:rotate(180deg)}
        .acc-body{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1)}
        .acc-item.active .acc-body{max-height:320px}
        .acc-content{padding:0 78px 22px 22px;color:var(--ink-2);font-size:15px;line-height:1.6}
        .acc-content p{margin:0 0 14px}
        .acc-bullets{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
        .acc-bullets li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink);font-weight:500}
        .acc-bullets li::before{content:"";width:6px;height:6px;border-radius:999px;background:var(--primary);flex-shrink:0}
        .deep-visual{position:sticky;top:100px;align-self:start;background:linear-gradient(160deg,#FFEAF8 0%,#F1E8FF 55%,#FFE6DC 100%);border-radius:28px;padding:36px;min-height:520px;border:1px solid rgba(210,60,194,0.08);box-shadow:var(--shadow-md);overflow:hidden}
        .deep-visual::before{content:"";position:absolute;width:220px;height:220px;background:radial-gradient(circle,rgba(255,255,255,0.6) 0%,transparent 65%);top:-60px;right:-60px;border-radius:50%;pointer-events:none}
        .dv-panel{position:relative;width:100%;height:100%;min-height:450px}
        .dv-scene{position:absolute;inset:0;opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease;pointer-events:none;display:flex;flex-direction:column;gap:14px}
        .dv-scene.active{opacity:1;transform:none;pointer-events:auto}
        .dv-card{background:#fff;border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(26,11,46,0.08),0 2px 6px rgba(26,11,46,0.04);border:1px solid rgba(26,11,46,0.04)}
        .dv-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-3);font-weight:700;margin-bottom:8px}
        .dv-h{font-size:16px;font-weight:700;letter-spacing:-0.01em;margin:0 0 4px}
        .dv-s{font-size:12px;color:var(--ink-3);margin:0}
        .dv-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .dv-stat{background:#fff;border-radius:12px;padding:12px 14px;border:1px solid rgba(26,11,46,0.04)}
        .dv-stat .n{font-size:22px;font-weight:800;letter-spacing:-0.02em}
        .dv-stat .l{font-size:10px;color:var(--ink-3);font-weight:600;text-transform:uppercase;letter-spacing:0.06em}
        .dv-stat.magenta .n{color:#D23CC2}
        .dv-stat.lavender .n{color:#7F5AF0}
        .dv-stat.peach .n{color:#C45A3E}
        .dv-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}
        .dv-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:rgba(26,11,46,0.025);font-size:12px}
        .dv-row .av{width:28px;height:28px;border-radius:999px;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
        .dv-row .nm{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dv-row .meta{font-size:10px;color:var(--ink-3);font-weight:500;margin-left:4px}
        .dv-row .tg{font-size:9px;font-weight:700;padding:3px 8px;border-radius:999px}
        .dv-wa-thread{display:flex;flex-direction:column;gap:10px}
        .dv-wa-line{max-width:80%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4;box-shadow:0 2px 6px rgba(26,11,46,0.05)}
        .dv-wa-line.out{align-self:flex-end;background:linear-gradient(135deg,#DCF8C6,#B7E4C7);color:#14361f;border-bottom-right-radius:4px}
        .dv-wa-line.in{align-self:flex-start;background:#fff;color:var(--ink);border-bottom-left-radius:4px}
        .dv-wa-line .who{font-size:10px;color:var(--ink-3);font-weight:700;margin-bottom:2px}
        .dv-wa-line .stamp{font-size:10px;color:var(--ink-3);margin-top:4px;display:flex;align-items:center;gap:4px;justify-content:flex-end}
        .dv-wa-bar{height:6px;border-radius:999px;background:rgba(26,11,46,0.08);overflow:hidden;position:relative}
        .dv-wa-bar i{position:absolute;inset:0 auto 0 0;width:82%;background:linear-gradient(90deg,#25D366,#1FB358);border-radius:999px}
        .seat-stage{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:8px}
        .seat-t{aspect-ratio:1;border-radius:999px;background:rgba(26,11,46,0.05);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--ink-2);transition:all .25s ease}
        .seat-t.full{background:linear-gradient(135deg,#D23CC2,#A78BFA);color:#fff;box-shadow:0 6px 14px rgba(210,60,194,0.28)}
        .seat-t.partial{background:rgba(255,188,173,0.55);color:#8C2E1B}
        .seat-t.empty{border:2px dashed rgba(26,11,46,0.12);background:transparent;color:var(--ink-3)}
        .seat-t.sel{background:#fff;border:2px solid var(--primary);color:var(--primary);box-shadow:0 0 0 4px rgba(210,60,194,0.12),0 6px 14px rgba(210,60,194,0.18);transform:scale(1.06)}
        .ai-sug{background:linear-gradient(135deg,rgba(210,60,194,0.06),rgba(167,139,250,0.06));border:1px solid rgba(210,60,194,0.15);border-radius:14px;padding:14px;display:flex;gap:12px;margin-top:8px}
        .ai-sug .spark2{width:32px;height:32px;border-radius:10px;background:var(--grad-bold);display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
        .ai-sug .copy{flex:1}
        .ai-sug .t{font-size:13px;font-weight:700}
        .ai-sug .s{font-size:11px;color:var(--ink-2);margin-top:2px;line-height:1.4}
        .ai-acts{display:flex;gap:6px;margin-top:10px}
        .ai-acts .chip{padding:5px 10px;font-size:11px;font-weight:600;border-radius:999px;background:#fff;border:1px solid rgba(26,11,46,0.08);color:var(--ink)}
        .ai-acts .chip.prim{background:var(--primary);color:#fff;border-color:var(--primary)}
        .inv-card{background:linear-gradient(160deg,#FFFFFF 0%,#FFF5FB 100%);border-radius:16px;padding:22px;text-align:center;border:1px solid rgba(210,60,194,0.12);box-shadow:0 6px 18px rgba(26,11,46,0.05);position:relative;overflow:hidden}
        .inv-monogram{width:56px;height:56px;border-radius:999px;background:var(--grad-bold);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px;margin:0 auto 12px;box-shadow:0 8px 20px rgba(210,60,194,0.3)}
        .inv-title{font-size:18px;font-weight:800;letter-spacing:-0.01em}
        .inv-sub{font-size:12px;color:var(--ink-3);margin-top:4px}
        .inv-acts{display:flex;gap:8px;justify-content:center;margin-top:16px}
        .inv-btn-yes{padding:8px 14px;font-size:12px;font-weight:700;border-radius:10px;background:var(--primary);color:#fff}
        .inv-btn-no{padding:8px 14px;font-size:12px;font-weight:700;border-radius:10px;background:#fff;border:1px solid var(--line);color:var(--ink)}
        @media(max-width:980px){.deep-grid{grid-template-columns:1fr;gap:32px}.deep-visual{position:static;min-height:460px;padding:28px}.acc-content{padding:0 22px 22px}}
        @media(max-width:560px){.dv-stat-row{gap:6px}.dv-stat{padding:10px}.dv-stat .n{font-size:18px}}

        /* ===== FAQ ===== */
        .faq-wrap{max-width:780px;margin:0 auto}
        .faq-list{display:flex;flex-direction:column;gap:12px}
        .faq-item{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:border-color .25s ease,box-shadow .25s ease}
        .faq-item:hover{border-color:rgba(26,11,46,0.14);box-shadow:var(--shadow-sm)}
        .faq-item.open{border-color:rgba(210,60,194,0.25);box-shadow:0 8px 24px rgba(210,60,194,0.06),0 2px 6px rgba(26,11,46,0.04)}
        .faq-trigger{width:100%;display:flex;align-items:center;gap:18px;padding:22px 26px;text-align:right}
        .faq-q{flex:1;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:var(--ink);line-height:1.4}
        .faq-plus{width:32px;height:32px;border-radius:999px;background:rgba(26,11,46,0.05);color:var(--ink-2);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s ease,color .2s ease}
        .faq-plus svg{transition:transform .35s cubic-bezier(.2,.7,.4,1)}
        .faq-item.open .faq-plus{background:var(--primary);color:#fff}
        .faq-item.open .faq-plus svg{transform:rotate(45deg)}
        .faq-body{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1)}
        .faq-item.open .faq-body{max-height:360px}
        .faq-a{padding:0 26px 24px;font-size:15px;line-height:1.65;color:var(--ink-2)}
        .faq-a p{margin:0}
        .faq-a p+p{margin-top:10px}
        .faq-foot{margin-top:64px;text-align:center;padding:48px 40px;border-radius:24px;background:linear-gradient(135deg,rgba(210,60,194,0.04),rgba(167,139,250,0.05),rgba(255,188,173,0.04));border:1px solid rgba(210,60,194,0.08)}
        .faq-foot .ft{font-size:17px;font-weight:700;color:var(--ink);margin-bottom:4px;letter-spacing:-0.01em}
        .faq-foot .fs{font-size:14.5px;color:var(--ink-2);margin-bottom:16px}

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
.plan-tagline{font-size:15px;color:var(--ink-2);margin:0 0 24px;line-height:1.4}
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
        .plan .pop-badge{position:absolute;top:18px;left:18px;background:rgba(210,60,194,0.08);color:var(--primary);font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px}
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
        .footer{padding:32px 0 24px;border-top:1px solid var(--line);margin-top:0}
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
      <header className="hp-nav" ref={navRef} id="nav" dir="rtl">
        <div className="wrap nav-inner">
          <a href="/login" className="btn btn-primary heb" id="navCta">
            כניסה / הרשמה
          </a>
          
          <nav className="nav-links" aria-label="ניווט ראשי">
            <a href="#features" className={activeSection === 'features' ? 'active' : ''}>פיצ׳רים</a>
            <a href="#how" className={activeSection === 'how' ? 'active' : ''}>יצירת אירוע</a>
            <a href="#pricing" className={activeSection === 'pricing' ? 'active' : ''}>חבילות</a>
            {/* <a href="#faq" className={activeSection === 'faq' ? 'active' : ''}>שאלות ותשובות</a> */}
          </nav>
          
          <a href="#" className="logo" aria-label="Kululu home">
            <img src="/logo-navbar.png" alt="Kululu" />
          </a>
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
          <circle cx="1200" cy="60" r="8" fill="#FFBCAD"/>
          <circle cx="200" cy="100" r="6" fill="#D23CC2" opacity="0.6"/>
          <circle cx="1400" cy="380" r="5" fill="#A78BFA"/>
          <circle cx="380" cy="680" r="7" fill="#A78BFA" opacity="0.55"/>
          <circle cx="1320" cy="160" r="5" fill="#B7E4C7" opacity="0.8"/>
          <circle cx="900" cy="30" r="6" fill="#A78BFA" opacity="0.5"/>
          <circle cx="140" cy="520" r="4" fill="#FFBCAD" opacity="0.65"/>
          <circle cx="1420" cy="620" r="5" fill="#FFE08A" opacity="0.7"/>
        </svg>
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy reveal">
              <h1 className="hero-title">
                תהנו מהאירוע שלכם, אנחנו נדאג לשאר
              </h1>
              <p className="hero-sub">
                מערכת חכמה לניהול האירוע - מוזמנים, אישורי הגעה, סידורי הושבה, תקציב ועוד הרבה
              </p>
              <div className="hero-cta">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_OPENING_MESSAGE)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg heb"
                  onClick={handleCtaClick}
                >
                  <IconBrandWhatsapp size={20} stroke={1.75} />
                  דברו איתנו
                </a>
                <a href="#how" className="btn btn-ghost btn-lg">
                  איך זה עובד
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{transform:'scaleX(-1)'}}><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
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

      {/* FEATURES — DEEP DIVE ACCORDION */}
      <section className="section deep" id="features" dir="rtl">
        <div className="wrap">
          <div className="section-head deep-head reveal">
            <h2 className="section-title">כל הפיצ׳רים שיעשו לכם סדר באירוע</h2>
            <p className="section-sub" style={{marginRight:0}}>מהתקציב ועד ההושבה - דאגנו להכל</p>
          </div>

          <div className="deep-grid">
            {/* Visual panel — RIGHT in RTL (order:1 pushes it after accordion) */}
            <div className="deep-visual reveal" aria-hidden="true" style={{order:1}}>
              <div className="dv-panel">

                {/* Scene: guests */}
                <div className={`dv-scene${activeScene === 'guests' ? ' active' : ''}`}>
                  <div className="dv-card">
                    <div className="dv-eyebrow">סקירה כללית</div>
                    <h4 className="dv-h">מאיה &amp; רועי · רשימת אורחים</h4>
                    <p className="dv-s">245 הוזמנו · 186 הגיבו</p>
                  </div>
                  <div className="dv-stat-row">
                    <div className="dv-stat magenta"><div className="n">142</div><div className="l">אישרו</div></div>
                    <div className="dv-stat lavender"><div className="n">28</div><div className="l">אולי</div></div>
                    <div className="dv-stat peach"><div className="n">16</div><div className="l">סירבו</div></div>
                  </div>
                  <div className="dv-card" style={{padding:'14px'}}>
                    <div className="dv-eyebrow">משפחות</div>
                    <div className="dv-list">
                      <div className="dv-row"><span className="av" style={{background:'#D23CC2'}}>ב</span><span className="nm">משפחת בר-און</span><span className="meta">4 אורחים</span><span className="tg tag-ok">כולם כן</span></div>
                      <div className="dv-row"><span className="av" style={{background:'#A78BFA'}}>כ</span><span className="nm">משפחת כהן</span><span className="meta">3 אורחים</span><span className="tg tag-wait">2 ממתינים</span></div>
                      <div className="dv-row"><span className="av" style={{background:'#FFBCAD',color:'#5a1b0c'}}>ל</span><span className="nm">משפחת לוי</span><span className="meta">5 אורחים</span><span className="tg tag-ok">כולם כן</span></div>
                    </div>
                  </div>
                </div>

                {/* Scene: whatsapp */}
                <div className={`dv-scene${activeScene === 'whatsapp' ? ' active' : ''}`}>
                  <div className="dv-card">
                    <div className="dv-eyebrow">הפצת וואטסאפ</div>
                    <h4 className="dv-h">תזכורת · עוד 6 ימים</h4>
                    <p className="dv-s">נשלח ל-142 מוזמנים · 11:42</p>
                  </div>
                  <div className="dv-wa-thread">
                    <div className="dv-wa-line out">
                      <div className="who">מאיה &amp; רועי ✨</div>
                      היי עדי! תזכורת קצרה — החתונה שלנו עוד 6 ימים. שמרי את המקום וענה כן לאישור.
                      <div className="stamp">11:42 ✓✓</div>
                    </div>
                    <div className="dv-wa-line in">
                      <div className="who">עדי בר-און</div>
                      כן! מגיע/ה עם +1 כמו שדיברנו 🎉
                      <div className="stamp" style={{justifyContent:'flex-start'}}>11:48</div>
                    </div>
                    <div className="dv-wa-line out">
                      נרשמתם 🎊 מחכים לכם ביום שבת!
                      <div className="stamp">11:49 ✓✓</div>
                    </div>
                  </div>
                  <div className="dv-card" style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,marginBottom:8}}><span>אחוז מסירה</span><span style={{color:'#1FB358'}}>82%</span></div>
                    <div className="dv-wa-bar"><i/></div>
                  </div>
                </div>

                {/* Scene: phone */}
                <div className={`dv-scene${activeScene === 'phone' ? ' active' : ''}`}>
                  <div className="dv-card">
                    <div className="dv-eyebrow">מעקב שיחות · סבב 2</div>
                    <h4 className="dv-h">18 מוזמנים טרם אישרו</h4>
                    <p className="dv-s">11 שוחח · 5 לא ענו · 2 לתיאום</p>
                  </div>
                  <div className="dv-card" style={{padding:'14px'}}>
                    <div className="dv-eyebrow">רשימת שיחות</div>
                    <div className="dv-list">
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#3B9EFF,#1A7FE8)'}}>ד</span>
                        <span className="nm">דוד גולדברג</span>
                        <span className="meta">13:24</span>
                        <span className="tg" style={{background:'rgba(59,158,255,0.13)',color:'#1264b8'}}>אישר ✓</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'#FFBCAD',color:'#5a1b0c'}}>ר</span>
                        <span className="nm">רחל שרון</span>
                        <span className="meta">לא ענתה</span>
                        <span className="tg" style={{background:'rgba(255,188,173,0.4)',color:'#8B3A1A'}}>התקשר שוב</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'#A78BFA'}}>נ</span>
                        <span className="nm">נועה ביטון</span>
                        <span className="meta">14:07</span>
                        <span className="tg" style={{background:'rgba(59,158,255,0.13)',color:'#1264b8'}}>אישרה ✓</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'#FFE08A',color:'#5a3a00'}}>א</span>
                        <span className="nm">אמיר כהן</span>
                        <span className="meta">לא ענה</span>
                        <span className="tg tag-wait">תיאום מחדש</span>
                      </div>
                    </div>
                  </div>
                  <div className="dv-card" style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,marginBottom:8}}>
                      <span>התקדמות סבב שיחות</span>
                      <span style={{color:'#1A7FE8'}}>61%</span>
                    </div>
                    <div className="dv-wa-bar"><i style={{width:'61%',background:'linear-gradient(90deg,#3B9EFF,#1A7FE8)'}}/></div>
                  </div>
                </div>

                {/* Scene: seating */}
                <div className={`dv-scene${activeScene === 'seating' ? ' active' : ''}`}>
                  <div className="dv-card">
                    <div className="dv-eyebrow">תרשים מושבים</div>
                    <h4 className="dv-h">האנגר 11 · 15 שולחנות</h4>
                    <p className="dv-s">168 מתוך 245 מקומות הוצבו · 12 שולחנות מלאים</p>
                  </div>
                  <div className="dv-card" style={{background:'linear-gradient(180deg,#FFFFFF 0%,#FCFAFE 100%)'}}>
                    <div className="seat-stage">
                      {(['full','full','partial','full','sel','full','partial','empty','full','full','partial','empty'] as const).map((cls, i) => (
                        <div key={i} className={`seat-t${cls ? ` ${cls}` : ''}`}>{i+1}</div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:14,marginTop:14,fontSize:10,color:'var(--ink-2)',fontWeight:600}}>
                      <span style={{display:'inline-flex',alignItems:'center',gap:5}}><i style={{width:8,height:8,borderRadius:999,background:'linear-gradient(135deg,#D23CC2,#A78BFA)',display:'inline-block'}}/> מלא</span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:5}}><i style={{width:8,height:8,borderRadius:999,background:'rgba(255,188,173,0.7)',display:'inline-block'}}/> חלקי</span>
                      <span style={{display:'inline-flex',alignItems:'center',gap:5}}><i style={{width:8,height:8,borderRadius:999,background:'transparent',border:'1.5px dashed rgba(26,11,46,0.2)',display:'inline-block'}}/> פנוי</span>
                    </div>
                  </div>
                </div>

                {/* Scene: budget */}
                <div className={`dv-scene${activeScene === 'budget' ? ' active' : ''}`}>
                  <div className="dv-card">
                    <div className="dv-eyebrow">ניהול תקציב</div>
                    <h4 className="dv-h">מאיה &amp; רועי · חתונה</h4>
                    <p className="dv-s">תקציב כולל: ₪85,000</p>
                  </div>
                  <div className="dv-stat-row">
                    <div className="dv-stat peach"><div className="n">₪61.2k</div><div className="l">הוצאות</div></div>
                    <div className="dv-stat"><div className="n" style={{color:'#1FB358'}}>₪23.8k</div><div className="l">נותר</div></div>
                    <div className="dv-stat"><div className="n" style={{color:'#1A7FE8'}}>₪14.5k</div><div className="l">מתנות</div></div>
                  </div>
                  <div className="dv-card" style={{padding:'14px'}}>
                    <div className="dv-eyebrow">ספקים ותשלומים</div>
                    <div className="dv-list">
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#FFBCAD,#FF8E73)',color:'#5a1b0c'}}>א</span>
                        <span className="nm">אולם האנגר 11</span>
                        <span className="meta">₪28,000</span>
                        <span className="tg tag-ok">שולם ✓</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#FFE08A,#FFB84D)',color:'#5a3a00'}}>ק</span>
                        <span className="nm">קייטרינג דלתא</span>
                        <span className="meta">₪18,500</span>
                        <span className="tg tag-ok">שולם ✓</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#A78BFA,#7F5AF0)'}}>פ</span>
                        <span className="nm">פרחים עדן</span>
                        <span className="meta">₪6,200</span>
                        <span className="tg tag-wait">בקרוב</span>
                      </div>
                    </div>
                  </div>
                  <div className="dv-card" style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,marginBottom:8}}>
                      <span>ניצול תקציב</span>
                      <span style={{color:'#C45A3E'}}>72%</span>
                    </div>
                    <div className="dv-wa-bar"><i style={{width:'72%',background:'linear-gradient(90deg,#FFBCAD,#FF8E73)'}}/></div>
                  </div>
                </div>

                {/* Scene: sharing */}
                <div className={`dv-scene${activeScene === 'sharing' ? ' active' : ''}`}>
                  <div className="dv-card">
                    <div className="dv-eyebrow">שיתוף ושיתוף פעולה</div>
                    <h4 className="dv-h">מאיה &amp; רועי · צוות האירוע</h4>
                    <p className="dv-s">3 משתתפים · עדכון אחרון לפני 4 דקות</p>
                  </div>
                  <div className="dv-card" style={{padding:'14px'}}>
                    <div className="dv-eyebrow">משתתפים</div>
                    <div className="dv-list">
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#D23CC2,#A78BFA)'}}>מ</span>
                        <span className="nm">מאיה (את)</span>
                        <span className="meta">בעלים</span>
                        <span className="tg" style={{background:'rgba(210,60,194,0.12)',color:'#A020A0'}}>ניהול מלא</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#3B9EFF,#1A7FE8)'}}>ר</span>
                        <span className="nm">רועי</span>
                        <span className="meta">שותף</span>
                        <span className="tg" style={{background:'rgba(59,158,255,0.12)',color:'#1264b8'}}>עריכה</span>
                      </div>
                      <div className="dv-row">
                        <span className="av" style={{background:'linear-gradient(135deg,#FFE08A,#FFB84D)',color:'#5a3a00'}}>ד</span>
                        <span className="nm">דנה - מתכננת</span>
                        <span className="meta">מוזמנת</span>
                        <span className="tg tag-wait">ממתין לאישור</span>
                      </div>
                    </div>
                  </div>
                  <div className="dv-card" style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px'}}>
                    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#FFE08A,#FFB84D)',color:'#5a3a00',flexShrink:0}}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600}}>הזמינו שותף נוסף</div>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--ink)'}}>הוסיפו מייל וקבעו הרשאות</div>
                    </div>
                    <button style={{padding:'6px 14px',fontSize:11,fontWeight:700,borderRadius:999,background:'linear-gradient(135deg,#FFE08A,#FFB84D)',color:'#5a3a00',border:'none',cursor:'pointer',flexShrink:0}}>הזמן</button>
                  </div>
                </div>

              </div>
            </div>

            {/* Accordion — LEFT in RTL */}
            <div className="acc reveal">

              {([
                { scene:'guests', color:'magenta', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, title:'ניהול מוזמנים', body:'ניהול מוזמנים חכם, פשוט ומהיר', bullets:['ייבוא בלתי מוגבל של קבצי Excel ו-CSV','מערכת AI חכמה למיפוי וסידור אוטומטי של הרשומות','חלוקה מהירה ופשוטה של המוזמנים לקבוצות וקטגוריות'] },
                { scene:'whatsapp', color:'green', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.555-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.512 5.26l.213.341-1.001 3.656 3.765-.956z"/></svg>, title:'הודעות וואטסאפ', body:'שלחו הזמנות, אישורי הגעה ותזכורות ישירות לוואטסאפ בתזמון מראש', bullets:['שליחת הזמנות, 2 סבבי אישורי הגעה ותזכורת ישירות לוואטסאפ','תזמון ההודעות מראש ושליחה אוטומטית','הודעת תזכורת ביום האירוע עם לינק ניווט לאירוע, מספר שולחן וקישור למתנה בביט או PayBox'] },
                { scene:'phone', color:'blue', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.52 9.77a19.79 19.79 0 01-3.07-8.67A2 2 0 012.43 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.44a16 16 0 006.63 6.63l1.27-.78a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>, title:'שיחות טלפון', body:'לא נותנים לאף מוזמן ליפול בין הכיסאות', bullets:['2 סבבי שיחות טלפון למוזמנים שטרם אישרו הגעה','מעקב מסודר אחרי סטטוס כל שיחה','תיעוד מלא של תוצאות השיחות ישירות במערכת','מעלים משמעותית את אחוזי אישורי ההגעה לאירוע'] },
                { scene:'seating', color:'lavender', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>, title:'סידורי הושבה', body:'סידורי הושבה מודרניים שמשנים את כל החוויה', bullets:['מסדרים את המוזמנים לשולחנות בצורה פשוטה ונוחה','מערכת AI שיוצרת סידורי הושבה לפי קבוצות וקטגוריות','משנים ומעדכנים את סידורי ההושבה בקלות באמצעות AI'] },
                { scene:'budget', color:'peach', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z"/><path d="M20 12h-4a2 2 0 000 4h4V12z"/><path d="M4 6V5a2 2 0 012-2h12a2 2 0 012 2v1"/></svg>, title:'ניהול תקציב', body:'ניהול כל ההוצאות, הספקים והמתנות במקום אחד', bullets:['מעקב מסודר אחרי הוצאות, תשלומים וספקים','תיעוד מלא של מתנות האורחים וההכנסות מהאירוע','הגדרת תקציב ומעקב אחריו בזמן אמת בדשבורד חכם'] },
                { scene:'sharing', color:'sun', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>, title:'שיתוף', body:'תכנון אירוע טוב יותר מתחיל בשיתוף פעולה', bullets:['מצרפים שותף לניהול האירוע בכמה קליקים','מגדירים הרשאות צפייה או עריכה לכל שותף','עובדים יחד בצורה מסודרת ומסונכרנת','שקיפות מלאה ושיתוף פעולה נוח בתהליך תכנון האירוע'] },
              ] as Array<{scene:string,color:string,icon:React.ReactNode,title:string,body:string,bullets:string[]}>).map(({scene,color,icon,title,body,bullets}) => (
                <div key={scene} className={`acc-item${activeScene === scene ? ' active' : ''}`}>
                  <button className="acc-trigger" type="button" onClick={() => { if (activeScene !== scene) setActiveScene(scene); }}>
                    <span className={`acc-ic ${color}`}>{icon}</span>
                    <span className="acc-title">{title}</span>
                    <span className="acc-chev">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </button>
                  <div className="acc-body">
                    <div className="acc-content">
                      <p dangerouslySetInnerHTML={{__html: body}}/>
                      <ul className="acc-bullets">
                        {bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{__html: b}}/>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section how" id="how" dir="rtl">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">יצירת אירוע</div>
            <h2 className="section-title">שלושה צעדים ליום ללא לחץ</h2>
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
              <p>גררו אורחים לשולחנות — או תנו ל-AI של Kululu להציע קיבוצים לפי מי מכיר את מי. הדפיסו, שתפו, סיימתם.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing" style={{paddingTop:64}} dir="rtl">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">חבילות</div>
            <h2 className="section-title">תשלום לפי אירוע. ללא הפתעות.</h2>
            <p className="section-sub">בוחרים את החבילה שמתאימה בדיוק לאירוע שלכם</p>
          </div>
          <div className="pricing-grid">
            {/* Plan 1 */}
            <div className="plan reveal">
              <div className="plan-price"><span className="amt">190</span><span className="cur">₪</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>100</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+10</b> רזרבה · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={() => handlePlanCtaClick(100)}>בחרו תוכנית</button>
            </div>
            {/* Plan 2 Featured */}
            <div className="plan featured reveal">
<div className="plan-price"><span className="amt">360</span><span className="cur">₪</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>200</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+20</b> רזרבה · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={() => handlePlanCtaClick(200)}>בחרו תוכנית</button>
            </div>
            {/* Plan 3 */}
            <div className="plan reveal">
              <div className="plan-price"><span className="amt">510</span><span className="cur">₪</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>300</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+30</b> רזרבה · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={() => handlePlanCtaClick(300)}>בחרו תוכנית</button>
            </div>
            {/* Plan 4 */}
            <div className="plan reveal">
              <div className="plan-price"><span className="amt">640</span><span className="cur">₪</span></div>
              <div className="plan-per">חד פעמי · לאירוע</div>
              <div className="plan-meta">
                <div className="row">
                  <span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
                  <span><b>400</b> רשומות אורחים</span>
                </div>
                <div className="row">
                  <span className="ic reserve-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z"/></svg></span>
                  <span><b>+40</b> רזרבה · חינם</span>
                </div>
              </div>
              <button className="plan-cta" onClick={() => handlePlanCtaClick(400)}>בחרו תוכנית</button>
            </div>
          </div>

          <p className="pricing-foot reveal">
            צריכים יותר מ-400 אורחים? <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_OPENING_MESSAGE)}`} target="_blank" rel="noopener noreferrer">דברו איתנו</a> — נתאים תוכנית במיוחד בשבילכם
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq" style={{paddingTop:32,paddingBottom:56}} dir="rtl">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">שאלות ותשובות</div>
            <h2 className="section-title">כדאי לדעת</h2>
            <p className="section-sub">יש לכם שאלות? יש לנו תשובות.</p>
          </div>

          <div className="faq-wrap">
            <div className="faq-list reveal">
              {([
                { q:'איך מתבצע החיוב ב Kululu?', a:'החיוב מתבצע לפי אירוע - תשלום חד פעמי לפי כמות רשומות המוזמנים שלכם' },
                { q:'מה אם רשימת האורחים גדלה באמצע התכנון?', a:<>ניתן לשדרג לחבילה גדולה יותר בכל עת, בקיזוז החבילה ששולמה כבר.<br/>בנוסף, אנו מעניקים לכם 10% רשומות רזרבה שנועדו בדיוק לתוספות של הרגע האחרון.</> },
                { q:'האם ניתן לנהל את האירוע יחד עם בן/בת הזוג או מפיק האירוע?', a:'בטח, ניתן לצרף שותפים לניהול האירוע עם הרשאות צפייה או עריכה.' },
                { q:'איך עוזר ה-AI מסדר הושבה?', a:<>הוא משתמש בקבוצות ובהערות שהוספתם - &quot;חברים של הכלה&quot;, &quot;משפחה חתן&quot;, &quot;חברים צבא&quot; ומציע שיבוצים שתוכלו לאשר, לערוך או להתעלם מהם.<br/>עוזר ה-AI לא מזיז אף אחד ללא אישורכם.</> },
                { q:'האם פרטי האורחים שלי מאובטחים?', a:<>בוודאי. רשימת האורחים שלכם שייכת לכם, אנחנו לא מוכרים, משתפים או משתמשים בה לשיווק.<br/>הנתונים מוצפנים, ואפשר לייצא הכל או למחוק את האירוע בלחיצה אחת אחרי היום הגדול.</> },
                { q:'האם המערכת מתאימה לכל סוגי האירועים?', a:'כן, המערכת מתאימה לחתונות, חינה, בר/בת מצוות, אירועים עסקיים, ימי הולדת ועוד.' },
                { q:'האם אפשר לייבא רשימות מוזמנים מקובץ אקסל?', a:'כן, ניתן לייבא קבצי Excel ו-CSV בצורה פשוטה ומהירה.' },
                { q:'מה קורה אם מוזמנים לא עונים?', a:'המערכת מבצעת סבב הודעות נוסף ולאחר מכן שני סבבי שיחות טלפון למוזמנים שטרם אישרו הגעה.' },
                { q:'האם המערכת עובדת גם מהטלפון?', a:'כן, המערכת מותאמת לשימוש מלא גם מהמובייל וגם מהמחשב.' },
              ] as Array<{q:string,a:React.ReactNode}>).map(({q,a},i) => (
                <div key={i} className={`faq-item${openFaqs.has(i) ? ' open' : ''}`}>
                  <button className="faq-trigger" type="button" onClick={() => toggleFaq(i)}>
                    <span className="faq-q">{q}</span>
                    <span className="faq-plus">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                  </button>
                  <div className="faq-body">
                    <div className="faq-a"><p>{a}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="faq-foot reveal">
            <div className="ft">לא מצאתם את מה שחיפשתם?</div>
            <div className="fs">יש לכם שאלה ספציפית? שמחים לענות ישירות בוואטסאפ</div>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_OPENING_MESSAGE)}`} target="_blank" rel="noopener" className="btn btn-ghost">
              <IconBrandWhatsapp size={18} stroke={1.75} />
              דברו איתנו
            </a>
          </div>
        </div>
      </section>


      {/* FOOTER */}
      <footer className="footer" dir="rtl">
        <div className="wrap">
          <div className="footer-inner">
            <div className="footer-links">
              <a href="#features">פיצ׳רים</a>
              <a href="#how">יצירת אירוע</a>
              <a href="#pricing">חבילות</a>
            </div>
            <a href="#" className="logo" aria-label="Kululu home">
              <img src="/logo-navbar.png" alt="Kululu" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
