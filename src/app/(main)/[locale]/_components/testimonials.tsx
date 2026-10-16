'use client';

import { useState } from 'react';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconStarFilled,
} from '@tabler/icons-react';

import { GoogleIcon } from '@/components/icons';

type Review = {
  name: string;
  rating: number;
  color: string;
  /** Copied verbatim from the customer's Google review - do not edit, fix or shorten. */
  paragraphs: string[];
};

const REVIEWS: Review[] = [
  {
    name: 'רוני שוקרון',
    rating: 5,
    color: 'magenta',
    paragraphs: [
      'בחרנו בקולולו לחתונה שלנו אחרי שדיברנו עם לא מעט ספקים לאישורי הגעה, מהרגע הראשון קיבלנו שירות נעים ואנושי, הסברים ברורים ואיפשרו לנו להתנסות במערכת ולהכיר אותה. גם כשרצינו לשנות דברים בדרך- היו קשובים אלינו וגמישים מאוד, ועזרו לנו בכל בקשה שהייתה לנו.  הרגשנו ממש בידיים טובות, קיבלנו אחוז אישורים גבוה מהאורחים שלנו בדיוק כמו שרצינו ועכשיו שאנחנו אחרי- יכולים להגיד שאנחנו הכי מרוצים שיש 😊 למי שמתלבט- ממליצים בחום! שירות מכל הלב וזה מורגש שקולולו לצידכם לאורך כל הדרך',
    ],
  },
  {
    name: 'Ofek',
    rating: 5,
    color: 'lavender',
    paragraphs: [
      'חייב לפרגן שהאפליקציה נוחה מאוד. בדקתי המון חלופות, אבל העובדה שיש ביט הייתה בדיוק מה שהייתי צריך. מעבר לזה שהמחיר הוגן, השירות פשוט מצוין - כל דבר שביקשתי נענה במהירות, אפילו דברים אישיים שאין במערכת ובשעות הערב. תודה רבה!',
    ],
  },
  {
    name: 'gal cohen',
    rating: 5,
    color: 'peach',
    paragraphs: [
      'רצינו להמליץ מכל הלב על Kululu! ❤️',
      'מהרגע הראשון קיבלנו שירות מקצועי, אדיב וזמין, והכול התנהל בצורה מסודרת, נוחה ופשוטה. קיבלנו מענה מהיר לכל שאלה, והרגשנו שיש על מי לסמוך לאורך כל הדרך.',
      'המערכת הייתה נוחה לשימוש, התהליך חסך לנו המון זמן והתעסקות, והכי חשוב – היינו ממש מרוצים מהשירות ומהיחס האישי.',
      'אין ספק שאנחנו ממליצים בחום לכל מי שמחפש חברת אישורי הגעה מקצועית, אמינה ושירותית. תודה ענקית על הליווי והעזרה! 🙏 ❤️',
    ],
  },
];

// The reviews are laid out twice per group so one group is wider than any screen,
// and the group is drawn twice so the loop can jump back by exactly one group width.
const GROUP = [...REVIEWS, ...REVIEWS];

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="rv-card">
      <figcaption className="rv-author">
        <span className={`rv-avatar ${review.color}`} aria-hidden="true">
          {review.name.charAt(0)}
        </span>
        <span className="rv-who">
          <span className="rv-name" dir="auto">{review.name}</span>
          <span className="rv-src">ביקורת ב-Google</span>
        </span>
        <span className="rv-g">
          <GoogleIcon />
        </span>
      </figcaption>
      <div
        className="rv-stars"
        role="img"
        aria-label={`${review.rating} מתוך 5 כוכבים`}
      >
        {Array.from({ length: review.rating }, (_, i) => (
          <IconStarFilled key={i} size={18} aria-hidden="true" />
        ))}
      </div>
      <blockquote className="rv-text">
        {review.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </blockquote>
    </figure>
  );
}

export function Testimonials() {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div className={`rv-marquee reveal${paused ? ' paused' : ''}`}>
        <div className="rv-track">
          {[0, 1].map((g) => (
            <ul key={g} className="rv-group">
              {GROUP.map((review, i) => {
                const duplicate = g > 0 || i >= REVIEWS.length;
                return (
                  <li
                    key={i}
                    className={duplicate ? 'rv-item rv-dup' : 'rv-item'}
                    aria-hidden={duplicate || undefined}
                  >
                    <ReviewCard review={review} />
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>
      <div className="rv-controls">
        <button
          type="button"
          className="btn btn-quiet rv-toggle"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? (
            <IconPlayerPlayFilled size={14} aria-hidden="true" />
          ) : (
            <IconPlayerPauseFilled size={14} aria-hidden="true" />
          )}
          {paused ? 'הפעלת התנועה' : 'עצירת התנועה'}
        </button>
      </div>
    </>
  );
}
