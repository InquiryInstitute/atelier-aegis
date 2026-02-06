/**
 * Sample lesson content for Ægis prototype.
 *
 * Each lesson has sections that can be displayed sequentially.
 * Sections can be: text, quote, reflection (journal prompt), or exercise.
 */

export interface LessonSection {
  id: string;
  type: 'text' | 'quote' | 'reflection' | 'exercise';
  content: string;
  /** For exercises */
  options?: { id: string; text: string; feedback: string }[];
  /** For reflections */
  prompt?: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  sections: LessonSection[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'attention-as-generosity',
    title: 'Attention as Generosity',
    subtitle: 'What does it mean to attend?',
    sections: [
      {
        id: 'intro',
        type: 'quote',
        content: '"Attention is the rarest and purest form of generosity." — Simone Weil, letter to Joë Bousquet, 1942',
      },
      {
        id: 'what-is-attention',
        type: 'text',
        content: `<h2>What Is Attention?</h2>
<p>We use the word "attention" constantly — pay attention, attention span, attention economy — but Simone Weil meant something quite different by it.</p>
<p>For Weil, attention is not effort. It is not concentration in the sense of straining toward something. It is closer to a kind of waiting — an openness that does not grasp at its object but allows the object to come to it.</p>
<p>This is counterintuitive. We are taught that learning requires effort, focus, determination. Weil suggests that the deepest form of learning requires something closer to receptivity.</p>`,
      },
      {
        id: 'gravity-and-grace',
        type: 'text',
        content: `<h2>Gravity and Grace</h2>
<p>Weil distinguished between two forces in human experience: gravity and grace.</p>
<p><strong>Gravity</strong> is the natural pull toward the easy, the habitual, the comfortable. It is the force that makes us check our phones, skim instead of read, reach for answers before sitting with questions.</p>
<p><strong>Grace</strong> is what interrupts gravity. It cannot be produced by willpower alone. But it can be prepared for — through attention.</p>
<p>Learning, in Weil's view, is not the accumulation of information. It is the practice of becoming available to what we do not yet understand.</p>`,
      },
      {
        id: 'exercise-gravity',
        type: 'exercise',
        content: 'Consider the last time you were reading something difficult. Which of these best describes what happened?',
        options: [
          {
            id: 'a',
            text: 'I pushed through it by force of will',
            feedback: 'This is what Weil would call "muscular effort" — useful, but not yet attention in her sense. Attention is what happens when effort gives way to receptivity.',
          },
          {
            id: 'b',
            text: 'I gave up and moved on to something easier',
            feedback: 'Gravity. The natural pull toward comfort. Weil would not judge this — she would ask what conditions might have allowed you to stay a little longer.',
          },
          {
            id: 'c',
            text: 'I stayed with the confusion without trying to resolve it',
            feedback: 'This is closest to what Weil meant by attention — a willingness to remain present with difficulty without forcing a resolution. She called this "waiting."',
          },
          {
            id: 'd',
            text: 'I got distracted without noticing',
            feedback: 'This is perhaps the most honest answer. Distraction is not a moral failing — it is gravity in action. Noticing that you were distracted is itself a form of attention.',
          },
        ],
      },
      {
        id: 'affliction',
        type: 'text',
        content: `<h2>Affliction and the Other</h2>
<p>Weil wrote extensively about <em>malheur</em> — affliction. Not mere suffering, but the kind of suffering that marks the soul, that makes a person invisible to others.</p>
<p>She believed that attention to the afflicted is the highest form of moral action — and also the rarest. It requires us to look at what is painful without turning away, without consoling ourselves, without fixing.</p>

<blockquote>"Those who are unhappy have no need for anything in this world but people capable of giving them their attention."</blockquote>

<p>This has implications for how we design learning systems. If a learner is struggling, the instinct of most software is to "fix" the problem — offer a hint, simplify the content, redirect. But Weil suggests that sometimes the most generous response is to simply notice, without rushing to resolve.</p>`,
      },
      {
        id: 'reflection-1',
        type: 'reflection',
        content: '',
        prompt: 'When has someone\'s simple attention — without advice, without fixing — been meaningful to you?',
      },
      {
        id: 'attention-and-learning',
        type: 'text',
        content: `<h2>Attention and Learning</h2>
<p>Weil believed that every school exercise, properly understood, is a preparation for the life of attention. Not because the content matters intrinsically, but because the practice of directing one's mind toward difficulty — and staying there — is the practice of becoming fully human.</p>

<blockquote>"The development of the faculty of attention forms the real object and almost the sole interest of studies."</blockquote>

<p>This means that a geometry problem and a prayer have something in common: both ask us to orient ourselves toward something we cannot yet see clearly, and to wait.</p>
<p>An instrument for learning, then, should not primarily measure whether the learner is "paying attention" in the surveillance sense. It should ask: is the learner being given conditions in which attention is possible?</p>`,
      },
      {
        id: 'exercise-design',
        type: 'exercise',
        content: 'If Weil were designing a learning system, which of these would she most likely include?',
        options: [
          {
            id: 'a',
            text: 'A timer showing how long you\'ve been focused',
            feedback: 'Weil would likely reject this — it turns attention into a metric, which is precisely the kind of measurement she distrusted. Attention cannot be clocked.',
          },
          {
            id: 'b',
            text: 'A way to sit with a question longer before seeing the answer',
            feedback: 'Yes. Weil valued the space between question and answer. She wrote that "waiting" — not rushing to resolution — is the essence of intellectual honesty.',
          },
          {
            id: 'c',
            text: 'A leaderboard comparing attention scores',
            feedback: 'This would horrify Weil. Comparison is a form of gravity — it pulls us away from the thing itself and toward social positioning.',
          },
          {
            id: 'd',
            text: 'A notification when your attention drops',
            feedback: 'This is closer to surveillance than attention. Weil would ask: who benefits from the notification? If the answer is "the system," not "the person," it fails her test.',
          },
        ],
      },
      {
        id: 'closing',
        type: 'text',
        content: `<h2>A Final Thought</h2>
<p>Ægis — this instrument you are using now — was designed with Weil's understanding of attention in mind. It does not grade your focus. It does not score your engagement. It tries, imperfectly and provisionally, to notice when the conditions for your learning might be improved.</p>
<p>It may be mistaken. It often will be. That uncertainty is not a flaw — it is the only honest posture for a system that presumes to say anything about another mind.</p>

<blockquote>"I may be mistaken."</blockquote>

<p>This is the canonical principle of Ægis. It applies to every inference, every suggestion, every moment of perceived understanding. The system holds its knowledge lightly, because that is what attention requires.</p>`,
      },
      {
        id: 'final-reflection',
        type: 'reflection',
        content: '',
        prompt: 'What is one thing you noticed about your own attention during this lesson?',
      },
    ],
  },
];
