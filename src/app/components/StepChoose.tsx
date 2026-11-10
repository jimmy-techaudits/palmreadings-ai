import { Briefcase, Heart, Sparkles, Users, type LucideIcon } from 'lucide-react';
import type { Focus, Mode } from '../../../shared/types';
import { StepHeader } from './ui';

interface Option {
  mode: Mode;
  focus: Focus;
  title: string;
  description: string;
  icon: LucideIcon;
}

const OPTIONS: Option[] = [
  { mode: 'solo', focus: 'overall', title: 'Full Life Reading', description: 'Personality, love, career, energy and turning points, comparing both hands.', icon: Sparkles },
  { mode: 'solo', focus: 'love', title: 'Love & Relationships', description: 'How you love, what you need, your patterns and your romantic timeline.', icon: Heart },
  { mode: 'solo', focus: 'career', title: 'Career & Purpose', description: 'Your work style, drive, natural strengths and career turning points.', icon: Briefcase },
  { mode: 'couple', focus: 'overall', title: 'Couples Compatibility', description: 'Read both partners’ hands to see how you connect, clash and grow.', icon: Users },
];

export function StepChoose({ onChoose }: { onChoose: (mode: Mode, focus: Focus) => void }) {
  return (
    <section>
      <StepHeader
        eyebrow="Step 1 of 3"
        title="What would you like to explore?"
        subtitle="Every reading looks at both of your hands. Pick the area you most want guidance on."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.title}
            onClick={() => onChoose(o.mode, o.focus)}
            className="panel group flex items-start gap-4 p-5 text-left transition hover:border-gold-400/60 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-gold-400 sm:p-6"
          >
            <span className="rounded-xl bg-gold-400/10 p-3 text-gold-400 transition group-hover:bg-gold-400/20">
              <o.icon size={26} />
            </span>
            <span>
              <span className="block font-display text-lg text-white">{o.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-violet-200/80">{o.description}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
