'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconBrandWhatsapp, IconCheck, IconGift, IconPlus } from '@tabler/icons-react';

// The utils path, not the barrel: the barrel carries the app's billing components.
import {
  BONUS_STEPS,
  GIFT_TRACK_END,
  PRICING_CHANNELS,
  RECORD_PACKAGE_RATES,
  RECORDS_MAX,
  RECORDS_MIN,
  RECORDS_STEP,
  clampRecords,
  nextBonusStep,
  quote,
  trackPct,
  type PricingChannel,
} from '@/features/billing/utils';

type Plan = {
  id: PricingChannel;
  name: string;
  desc: string;
  tint: string;
  ink: string;
  icon: React.ReactNode;
  /** The Plan this one builds on: its lines are included too, and its icon is drawn behind. */
  base?: Plan;
  /** What this Plan includes (ADR 0034) on top of its base, as the summary lists it. */
  lines: { t: string; s: string }[];
};

const WHATSAPP: Plan = {
  id:'whatsapp', name:'WhatsApp', desc:'דרך החיבור הרשמי של WhatsApp - הדשבורד מתעדכן בזמן אמת בכל קריאה ואישור הגעה', tint:'rgba(37,211,102,0.14)', ink:'#15803D',
  icon:<IconBrandWhatsapp size={20} stroke={2} aria-hidden="true" />,
  lines:[
    { t:'הודעת הזמנה ראשונה', s:'אפשר להחליף בסבב אישור הגעה, לפי בחירתכם' },
    { t:'2 סבבי אישור הגעה', s:'ניתן לצרף להודעות את ההזמנה לאירוע' },
    { t:'תזכורת לפני האירוע', s:'כולל מספר שולחן ואפשרות למתנה בביט או בפייבוקס, ללא עמלה' },
    { t:'הודעת תודה אחרי האירוע', s:'ניתן לצרף להודעה קישור למתנה' },
  ],
};

const WHATSAPP_CALLS: Plan = {
  id:'whatsapp_calls', name:'WhatsApp + שיחות', desc:'כל תזמוני ה-WhatsApp כלולים, ובנוסף נציג אנושי מתקשר למוזמנים שלא ענו', tint:'rgba(139,92,246,0.14)', ink:'#7C3AED',
  icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>,
  base:WHATSAPP,
  lines:[
    { t:'2 סבבי שיחות טלפון', s:'נציג אנושי מתקשר למי שעוד לא ענה' },
    { t:'תוצאות השיחות בזמן אמת', s:'כל תשובה מתעדכנת אצלכם כשהשיחה מסתיימת' },
  ],
};

/** Keyed by channel, so the compiler insists on a tile for every Plan the homepage sells. */
const PLANS: Record<PricingChannel, Plan> = { whatsapp: WHATSAPP, whatsapp_calls: WHATSAPP_CALLS };
const CHANNELS = PRICING_CHANNELS.map((id) => PLANS[id]);

/** Every line any Plan includes, in order: the summary keeps them all and folds away the rest. */
const PLAN_LINES = CHANNELS.flatMap((plan) => plan.lines.map((line) => ({ ...line, plan })));

const TICKS = [50, 250, 500, 750, 1000];

const formatShekels = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
const rateLabel = (channel: PricingChannel) => `${formatShekels(RECORD_PACKAGE_RATES[channel])} ₪`;

/** Opaque over white, so the front tile hides what is behind it instead of tinting it. */
const solid = (tint: string) => `linear-gradient(${tint}, ${tint}), #fff`;

function StackedIcon({ front, back }: { front: Plan; back: Plan }) {
  return (
    <span className="ps-chan-ic ps-chan-stack" aria-hidden="true">
      <span className="back" style={{ background: solid(back.tint), color: back.ink }}>{back.icon}</span>
      <span className="front" style={{ background: solid(front.tint), color: front.ink }}>{front.icon}</span>
    </span>
  );
}

export function PricingSimulator({
  onCtaClick,
}: {
  onCtaClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const [channel, setChannel] = useState<PricingChannel>('whatsapp');
  const [records, setRecords] = useState(150);

  const selected = PLANS[channel];
  const { total, bonus, packageSize } = quote(records, channel);
  const next = nextBonusStep(records);
  // While the bonus folds away it keeps showing the first step, never "+0"
  const shownBonus = bonus || BONUS_STEPS[0].records;
  const totalLabel = formatShekels(total);
  const pct = trackPct(records, RECORDS_MAX);
  const giftPct = trackPct(records, GIFT_TRACK_END);

  return (
    <div className="ps-grid reveal">
      <div className="ps-card ps-config">
        <div className="ps-block">
          <div className="ps-step-head">
            <span className="ps-step-num">1</span>
            <h3 className="ps-step-title">איך נפנה למוזמנים?</h3>
          </div>
          <div role="radiogroup" aria-label="חבילה" className="ps-channels">
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
                    {c.base ? <StackedIcon front={c} back={c.base} /> : (
                      <span className="ps-chan-ic" style={{ background: c.tint, color: c.ink }}>{c.icon}</span>
                    )}
                    <span className="ps-chan-text">
                      <span className="ps-chan-name">{c.name}</span>
                      <span className="ps-chan-price">
                        <span className="amt">{rateLabel(c.id)}</span>
                        <span className="per">לרשומה</span>
                      </span>
                    </span>
                  </span>
                  <span className="ps-chan-desc">{c.desc}</span>
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
                <h3 className="ps-step-title"><label htmlFor="ps-records">כמה רשומות יש לכם?</label></h3>
                <p className="ps-step-sub">רשומה = מספר טלפון - של יחיד, זוג או משפחה</p>
              </div>
            </div>
            <div className="ps-stepper">
              <button type="button" className="ps-step-btn" onClick={() => setRecords(clampRecords(records - RECORDS_STEP))} aria-label={`הורדת ${RECORDS_STEP} רשומות`}>−</button>
              <div className="ps-count">
                <span className="n">{records}</span>
                <span className="u">רשומות</span>
              </div>
              <button type="button" className="ps-step-btn" onClick={() => setRecords(clampRecords(records + RECORDS_STEP))} aria-label={`הוספת ${RECORDS_STEP} רשומות`}>+</button>
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
                    right: `${trackPct(v, RECORDS_MAX)}%`,
                    transform: `translateX(${i === 0 ? 0 : i === TICKS.length - 1 ? 100 : 50}%)`,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Every bonus step stays in view on one timeline, so the next gift is always a target */}
          <div className="ps-gift">
            <div className="ps-gift-head">
              <span className="ps-gift-title">
                <IconGift size={18} stroke={2} aria-hidden="true" />
                {!bonus && next ? `עוד ${next.minPaid - records} רשומות ו-${next.records} במתנה` : `${bonus} רשומות נוספות במתנה`}
              </span>
              <span className={`ps-gift-pill${bonus ? ' on' : ''}`} aria-hidden={!bonus}>
                {/* Keyed so a bigger gift pops in rather than just changing digits */}
                <span key={shownBonus} className="n" dir="ltr">+{shownBonus}</span> במתנה
              </span>
            </div>
            <div className="ps-gift-track" aria-hidden="true">
              <div className="ps-gift-rail"><span style={{ width: `${giftPct}%` }} /></div>
              <span className="ps-gift-dot" style={{ right: `${giftPct}%` }} />
              {BONUS_STEPS.map((step) => {
                const on = records >= step.minPaid;
                return (
                  <div key={step.minPaid} className={`ps-gift-step${on ? ' on' : ''}`} style={{ right: `${trackPct(step.minPaid, GIFT_TRACK_END)}%` }}>
                    <span className="mark"><IconCheck size={12} stroke={3.2} /></span>
                    <span className="n" dir="ltr">+{step.records}</span>
                    <span className="from">מ-{step.minPaid}</span>
                  </div>
                );
              })}
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

        <div className="ps-includes">
          <span className="ps-includes-label">מה כלול</span>
          {/* Rows fold open and shut rather than mount, so switching Plans grows the card smoothly */}
          {PLAN_LINES.map((line) => {
            const on = line.plan === selected || line.plan === selected.base;
            return (
              <div key={line.t} className={`ps-fold${on ? ' open' : ''}`} aria-hidden={!on}>
                <div className="ps-inc">
                  {/* A Plan's own lines get a check; what it adds on top of its base gets a plus */}
                  <span className="ic" style={{ background: line.plan.tint, color: line.plan.ink }} aria-hidden="true">
                    {line.plan.base ? <IconPlus size={12} stroke={3} /> : <IconCheck size={12} stroke={3} />}
                  </span>
                  <span className="txt">
                    <span className="t">{line.t}</span>
                    <span className="s">{line.s}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ps-lines">
          <div className="ps-line">
            <span className="k">{records} רשומות × {rateLabel(channel)}</span>
            <span className="v">{totalLabel} ₪</span>
          </div>
          <div className={`ps-fold${bonus ? ' open' : ''}`} aria-hidden={!bonus}>
            <div className="ps-line">
              <span className="k ps-line-bonus">
                <IconPlus size={16} stroke={2.5} color="#16A34A" aria-hidden="true" />
                {shownBonus} רשומות נוספות
              </span>
              <span className="v ps-free">ללא עלות</span>
            </div>
          </div>
          <div className="ps-line">
            <span className="k strong">סה״כ רשומות במערכת</span>
            <span className="v bold">{packageSize}</span>
          </div>
        </div>

        <Link href="/start" className="ps-cta heb" onClick={onCtaClick}>
          להתחיל עם {packageSize} רשומות
        </Link>
        <span className="ps-cta-note">נסו את המערכת המלאה בחינם - משלמים רק כשמפעילים את השליחה</span>
      </aside>
    </div>
  );
}
