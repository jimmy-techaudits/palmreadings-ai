// The interpretation rulebook. The Interpret step must ground every claim in an
// observed feature and read its meaning from here, so readings are consistent
// and specific. Edit this file to change how features are interpreted.

export const RULEBOOK = `
# PALMISTRY RULEBOOK

## Hands
- Non-dominant hand = innate temperament, potential, what they were born with.
- Dominant hand = what they have developed and are actively living now.
- Differences between the two hands show growth, effort, or untapped potential. Similarities show deeply rooted traits.

## Hand shape & element
- Earth (square palm, short fingers): grounded, practical, reliable, hands-on, loyal, can resist change.
- Air (square palm, long fingers): curious, communicative, analytical, sociable, can overthink or detach emotionally.
- Fire (rectangular palm, short fingers): energetic, bold, spontaneous, inspiring, can be impatient or burn out.
- Water (rectangular palm, long fingers): intuitive, empathetic, creative, sensitive, can absorb others' moods.

## Thumb
- Large or strong thumb: willpower, determination, leadership. Small thumb: adaptable, prefers harmony over control.
- Wide angle from palm: generous, open, independent, risk-taking. Narrow angle: careful, private, self-protective.
- High-set thumb: independent, quick-minded. Low-set: practical, steady, warm.

## Fingers
- Index longer than ring: confident in leadership, ambitious, values status and self-direction.
- Ring longer than index: creative, risk-tolerant, charismatic, drawn to performance or aesthetics.
- About equal: balanced between ambition and creativity; diplomatic.
- Long fingers overall: detail-oriented, patient, thoughtful. Short fingers: big-picture, fast, action-oriented.

## Heart line (emotions, love)
- Ends under or near the index finger: idealistic, selective, high standards in love, devoted once committed.
- Ends between index and middle fingers: balanced giver and receiver, warm but grounded.
- Ends under the middle finger: self-directed in love, passionate, needs independence and physical expression.
- Strongly curved: emotionally expressive, romantic, openly affectionate.
- Straight: reserved, private, shows love through actions more than words.
- Long: emotionally generous. Short: values autonomy, focuses love on a few people.
- Deep: intense, steady feelings. Faint: sensitive, emotions shift easily.
- Chains or islands: periods of emotional sensitivity or confusion; caring deeply.
- Break: an emotional turning point or relationship change that reshaped them.
- Fork at the end: can balance head and heart; adaptable in love.
- Branches rising upward: happy relationships or optimism. Dropping downward: disappointments that taught them.

## Head line (mind, decisions, work)
- Long: thorough, considers many angles. Short: decisive, practical, focused.
- Straight: logical, analytical, realistic, good with systems and money.
- Gently curved or sloping: creative, imaginative, intuitive thinker.
- Strongly sloping toward the wrist (Luna): very imaginative, artistic, sometimes moody.
- Joined to the life line at the start: careful, thinks before acting, close family influence early on.
- Separate from the life line: independent, adventurous, broke from convention early.
- Writer's fork at the end: sees multiple perspectives; strong communicator or storyteller.
- Deep: focused concentration. Faint or chained: scattered attention or mind running many threads.
- Break: a change in thinking, direction or field.

## Life line (vitality, life changes). NEVER interpret as lifespan, illness or death.
- Wide arc into the palm: high energy, enthusiasm, appetite for experience.
- Close to the thumb: conserves energy, prefers comfort and familiarity, cautious.
- Deep: robust, resilient. Faint: needs rest and recharge, sensitive to stress.
- Break or overlap: a major life change, move, or reinvention (not harm).
- Branches rising upward: achievements and growth periods.
- Double/sister line: strong support system or protective energy.

## Fate line (career path, life direction)
- Clear and deep: strong sense of direction, steady path, possibly a calling.
- Faint or absent: self-made path, freedom from expectations, multiple careers.
- Starts at the wrist: early sense of responsibility or direction.
- Starts from the life line: self-made success, strong family influence on path.
- Starts from the Luna mount (outer palm): success through other people, public, or creativity.
- Starts mid-palm: direction found later, often in their 30s.
- Breaks or changes of direction: career shifts.

## Sun (Apollo) line
- Present: creativity, recognition, satisfaction from what they create. Absent: success comes through effort rather than spotlight (no negative meaning).

## Mercury line
- Communication, business sense, intuition. Interpret as communication and commerce only; never health.

## Mounts
- Jupiter (under index): ambition, leadership, confidence. Saturn (under middle): discipline, wisdom, solitude.
- Apollo (under ring): creativity, charisma, joy. Mercury (under little): communication, wit, business.
- Venus (thumb base): love, sensuality, warmth, vitality. Luna (outer lower palm): imagination, intuition, travel.
- Mars (middle of palm, edges): courage, resilience, assertiveness.
- Prominent = strong expression; flat = quieter expression of that quality.

## Markings
- Star: sudden distinction or bright event in that area. Cross: a crossroads or challenge that brings growth.
- Triangle: talent or aptitude. Square: protection through a hard period. Grille: scattered energy in that area.
- Trident: success and luck. Girdle of Venus: heightened sensitivity and emotional depth.
- Simian crease (heart and head line merged): intense focus, all-or-nothing, head and heart work as one.

## Relationship (marriage) lines: on the palm edge below the little finger
- Each clear, long, deep line = one significant, committed relationship or marriage. Short or faint lines = meaningful romances that did not become long-term commitments.
- Count significant marriages/partnerships = clear long lines. Give a range when lines are ambiguous.
- Position (timing): close to the heart line = earlier (roughly late teens to mid-20s); middle = roughly mid-20s to mid-30s; close to the little finger = later (late 30s onward).
- Fork at the end: distance or separation in that relationship. Break: a pause or reconciliation. Island: a rocky phase.
- Upward curve: a fulfilling partnership. Downward: outlives or out-grows the partner (never say a partner dies).

## Children lines: fine vertical lines rising from relationship lines
- Each clear vertical line = a potential child or a deep nurturing bond. Strong lines are often read as boys, finer lines as girls (offer only as folklore, lightly).
- No visible lines: not an absence of children; say the lines are too fine to read and nurturing may come in many forms.

## Timing scale (approximate)
- Life line: start near the index finger ~ age 0, the point below the middle of the index–middle gap ~ age 20, below the middle finger ~ 35, curving below the thumb ~ 50+.
- Fate line: where it crosses the head line ~ age 35, the heart line ~ age 50.

## Ethics
- Present everything as tendencies and potential, never certainties.
- Never predict death, illness, accidents, infertility, or pregnancy. Never discuss lifespan.
- Never say a relationship is doomed. Frame challenges as growth.
- If a line is not visible, say it was not readable instead of guessing.
`.trim();
