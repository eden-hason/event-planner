'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  PRICING_RATES,
  RECORDS_MAX,
  RECORDS_MIN,
  RECORDS_STEP,
  clampRecords,
  quote,
  type PricingChannel,
} from './pricing';

const CHANNELS: Array<{
  id: PricingChannel;
  name: string;
  desc: string;
  tint: string;
  ink: string;
  icon: React.ReactNode;
}> = [
  { id:'sms', name:'SMS', desc:'הדרך הפשוטה ביותר - הודעות טקסט קצרות ישירות לטלפון', tint:'rgba(59,130,246,0.12)', ink:'#2563EB', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg> },
  { id:'whatsapp', name:'וואטסאפ', desc:'הודעות עשירות עם תמונה וכפתורי תשובה בלחיצה אחת', tint:'rgba(37,211,102,0.14)', ink:'#15803D', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg> },
  { id:'whatsapp_calls', name:'וואטסאפ + שיחות', desc:'כל היתרונות של וואטסאפ, ומי שלא הגיב - מקבל שיחת טלפון', tint:'rgba(139,92,246,0.14)', ink:'#7C3AED', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg> },
];

const TICKS = [50, 250, 500, 750, 1000];

const formatShekels = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
const rateLabel = (channel: PricingChannel) => `${formatShekels(PRICING_RATES[channel])} ₪`;

export function PricingSimulator({
  onCtaClick,
}: {
  onCtaClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const [channel, setChannel] = useState<PricingChannel>('whatsapp');
  const [records, setRecords] = useState(150);

  const selected = CHANNELS.find((c) => c.id === channel)!;
  const { total, bonus, capacity } = quote(records, channel);
  const totalLabel = formatShekels(total);
  const pct = ((records - RECORDS_MIN) / (RECORDS_MAX - RECORDS_MIN)) * 100;

  return (
    <div className="ps-grid reveal">
      <div className="ps-card ps-config">
        <div className="ps-block">
          <div className="ps-step-head">
            <span className="ps-step-num">1</span>
            <h3 className="ps-step-title">איך נפנה למוזמנים?</h3>
          </div>
          <div role="radiogroup" aria-label="ערוץ שליחה" className="ps-channels">
            {CHANNELS.map((c) => {
              const on = c.id === channel;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChannel(c.id)}
                  className={`ps-chan${on ? ' on' : ''}`}
                >
                  <span className="ps-chan-head">
                    <span className="ps-chan-ic" style={{ background: c.tint, color: c.ink }}>{c.icon}</span>
                    <span className="ps-chan-name">{c.name}</span>
                  </span>
                  <span className="ps-chan-desc">{c.desc}</span>
                  <span className="ps-chan-price">
                    <span className="amt">{rateLabel(c.id)}</span>
                    <span className="per">לרשומה</span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* Phones show the tiles without descriptions, so only the chosen one's is spelled out */}
          <p className="ps-chan-note">{selected.desc}</p>
        </div>

        <div className="ps-block ps-block-records">
          <div className="ps-records-head">
            <div className="ps-step-head">
              <span className="ps-step-num">2</span>
              <div className="ps-step-text">
                <h3 className="ps-step-title"><label htmlFor="ps-records">כמה רשומות תרצו?</label></h3>
                <p className="ps-step-sub">רשומה = מספר טלפון - של יחיד, זוג או משפחה</p>
              </div>
            </div>
            <div className="ps-stepper">
              <button type="button" className="ps-step-btn" onClick={() => setRecords(clampRecords(records - RECORDS_STEP))} aria-label="הורדת 50 רשומות">−</button>
              <div className="ps-count">
                <span className="n">{records}</span>
                <span className="u">רשומות</span>
              </div>
              <button type="button" className="ps-step-btn" onClick={() => setRecords(clampRecords(records + RECORDS_STEP))} aria-label="הוספת 50 רשומות">+</button>
            </div>
          </div>

          <div className="ps-slider">
            <input
              id="ps-records"
              className="ps-range"
              type="range"
              min={RECORDS_MIN}
              max={RECORDS_MAX}
              step={RECORDS_STEP}
              value={records}
              onChange={(e) => setRecords(clampRecords(Number(e.target.value)))}
              aria-valuetext={`${records} רשומות`}
              style={{ background: `linear-gradient(to left, #D23CC2 0%, #8B3FF0 ${pct}%, #EDE7F3 ${pct}%, #EDE7F3 100%)` }}
            />
            <div className="ps-ticks" aria-hidden="true">
              {TICKS.map((v, i) => (
                <span
                  key={v}
                  style={{
                    right: `${((v - RECORDS_MIN) / (RECORDS_MAX - RECORDS_MIN)) * 100}%`,
                    transform: `translateX(${i === 0 ? 0 : i === TICKS.length - 1 ? 100 : 50}%)`,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="ps-gift">
            <div className="ps-gift-badge">
              <span className="n" dir="ltr">+{bonus}</span>
              <span className="u">רשומות</span>
            </div>
            <div className="ps-gift-text">
              <span className="t">{bonus} רשומות נוספות במתנה</span>
              <span className="d">לאורחים שנזכרתם בהם ברגע האחרון - כבר כלולות במחיר החבילה</span>
            </div>
          </div>
        </div>
      </div>

      <aside aria-live="polite" className="ps-card ps-summary">
        <div className="ps-sum-head">
          <span className="ps-sum-label">סיכום החבילה</span>
          <div className="ps-sum-sel">
            <span className="ps-pill" style={{ background: selected.tint, color: selected.ink }}>{selected.name}</span>
            <span className="ps-sum-rate">{rateLabel(channel)} לרשומה</span>
          </div>
        </div>

        <div className="ps-total">
          <div className="ps-total-row">
            <span className="amt">{totalLabel}</span>
            <span className="cur">₪</span>
          </div>
          <span className="ps-total-note">תשלום חד פעמי</span>
        </div>

        <div className="ps-lines">
          <div className="ps-line">
            <span className="k">{records} רשומות × {rateLabel(channel)}</span>
            <span className="v">{totalLabel} ₪</span>
          </div>
          <div className="ps-line">
            <span className="k ps-line-bonus">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              {bonus} רשומות נוספות
            </span>
            <span className="v ps-free">ללא עלות</span>
          </div>
          <div className="ps-line">
            <span className="k strong">סה״כ רשומות במערכת</span>
            <span className="v bold">{capacity}</span>
          </div>
        </div>

        <div className="ps-more">
          <span className="ps-more-title">צריכים עוד רשומות? אין בעיה</span>
          <div className="ps-more-row">
            <span className="ps-more-ic" style={{ color: '#D23CC2' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
            </span>
            <span className="ps-more-text"><strong>רוצים שנשלח גם להם?</strong> מוסיפים רשומות לתזמון ב-{rateLabel(channel)} לרשומה</span>
          </div>
          <div className="ps-more-row">
            <span className="ps-more-ic" style={{ color: '#8B3FF0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
            </span>
            <span className="ps-more-text"><strong>רק לרשום אותם?</strong> מוסיפים לרשימה, מעדכנים סטטוס בעצמכם או שולחים קישור אישור אישי</span>
          </div>
        </div>

        <Link href="/start" className="ps-cta heb" onClick={onCtaClick}>
          להתחיל עם {capacity} רשומות
        </Link>
        <span className="ps-cta-note">נסו את המערכת המלאה בחינם - משלמים רק כשמפעילים את השליחה</span>
      </aside>
    </div>
  );
}
