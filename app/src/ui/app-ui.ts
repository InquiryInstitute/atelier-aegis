/**
 * Ægis App UI
 *
 * Manages all screens and their interactions with the pipeline.
 * Anti-surveillance aesthetics: no meters, no scores, no red/green.
 */

import type { LearningConditionState } from '@aegis/inference';
import type { Intervention } from '@aegis/policy';
import { PerceptionTier } from '@aegis/feature-stream';
import type { PerceptionState } from '../perception/web-perception';
import type { AegisPipeline } from '../pipeline/aegis-pipeline';
import { LESSONS } from '../content/lessons';
import type { Lesson, LessonSection } from '../content/lessons';

type Screen = 'home' | 'lesson' | 'privacy';

export class AppUI {
  private pipeline: AegisPipeline;
  private currentScreen: Screen = 'home';
  private currentLesson: Lesson | null = null;
  private currentSectionIndex = 0;
  private drawerOpen = false;
  private currentIntervention: Intervention | null = null;

  // DOM refs
  private app: HTMLElement;
  private homeScreen: HTMLElement;
  private lessonScreen: HTMLElement;
  private privacyScreen: HTMLElement;
  private lessonContent: HTMLElement;
  private pulseIndicator: HTMLElement;
  private interventionOverlay: HTMLElement;
  private explainabilityDrawer: HTMLElement;
  private cameraDialog: HTMLElement;
  private microBreak: HTMLElement;
  private statusBar: HTMLElement;

  constructor(pipeline: AegisPipeline) {
    this.pipeline = pipeline;
    this.app = document.getElementById('app')!;

    // Screen refs
    this.homeScreen = document.getElementById('screen-home')!;
    this.lessonScreen = document.getElementById('screen-lesson')!;
    this.privacyScreen = document.getElementById('screen-privacy')!;
    this.lessonContent = document.getElementById('lesson-content')!;
    this.pulseIndicator = document.getElementById('pulse')!;
    this.interventionOverlay = document.getElementById('intervention-overlay')!;
    this.explainabilityDrawer = document.getElementById('explainability-drawer')!;
    this.cameraDialog = document.getElementById('camera-dialog')!;
    this.microBreak = document.getElementById('micro-break')!;
    this.statusBar = document.getElementById('status-bar')!;

    this.bindEvents();
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  showScreen(screen: Screen): void {
    this.currentScreen = screen;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    switch (screen) {
      case 'home':
        this.homeScreen.classList.add('active');
        this.pipeline.pause();
        break;
      case 'lesson':
        this.lessonScreen.classList.add('active');
        break;
      case 'privacy':
        this.privacyScreen.classList.add('active');
        break;
    }
  }

  async startLesson(lessonId?: string): Promise<void> {
    const lesson = LESSONS.find(l => l.id === lessonId) ?? LESSONS[0];
    this.currentLesson = lesson;
    this.currentSectionIndex = 0;

    // Show lesson screen
    this.showScreen('lesson');
    document.getElementById('lesson-title')!.textContent = lesson.title;
    this.renderLesson();

    // Attach tracking to content scroller
    const scroller = document.getElementById('lesson-scroller')!;
    this.pipeline.attachTracking(scroller);

    // Show camera dialog on first lesson
    const perceptionState = this.pipeline.getPerceptionState();
    if (perceptionState === 'uninitialized') {
      this.showCameraDialog();
    } else {
      this.pipeline.start();
    }
  }

  // -------------------------------------------------------------------------
  // Lesson rendering
  // -------------------------------------------------------------------------

  private renderLesson(): void {
    if (!this.currentLesson) return;

    const html = this.currentLesson.sections
      .map(section => this.renderSection(section))
      .join('');

    this.lessonContent.innerHTML = `<div class="lesson-content">${html}</div>`;
    this.bindLessonEvents();
  }

  private renderSection(section: LessonSection): string {
    switch (section.type) {
      case 'text':
        return `<div id="section-${section.id}" class="lesson-section">${section.content}</div>`;

      case 'quote':
        return `<div id="section-${section.id}" class="lesson-section">
          <blockquote>${section.content}</blockquote>
        </div>`;

      case 'reflection':
        return `<div id="section-${section.id}" class="lesson-section">
          <div class="reflection">
            <div class="reflection__prompt">${section.prompt}</div>
            <textarea class="reflection__input" placeholder="Take your time..." rows="4"></textarea>
          </div>
        </div>`;

      case 'exercise':
        return `<div id="section-${section.id}" class="lesson-section">
          <div class="exercise" data-section-id="${section.id}">
            <p class="exercise__question">${section.content}</p>
            <div class="exercise__options">
              ${section.options!.map(opt => `
                <button class="exercise__option" data-option-id="${opt.id}" data-feedback="${this.escapeAttr(opt.feedback)}">
                  ${opt.text}
                </button>
              `).join('')}
            </div>
            <div class="exercise__feedback" style="display: none;"></div>
          </div>
        </div>`;

      default:
        return '';
    }
  }

  private bindLessonEvents(): void {
    // Exercise options
    this.lessonContent.querySelectorAll('.exercise__option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const exercise = target.closest('.exercise')!;
        const feedback = target.dataset.feedback!;
        const feedbackEl = exercise.querySelector('.exercise__feedback') as HTMLElement;

        // Mark selected
        exercise.querySelectorAll('.exercise__option').forEach(o => o.classList.remove('selected'));
        target.classList.add('selected');

        // Show feedback
        feedbackEl.textContent = feedback;
        feedbackEl.style.display = 'block';

        // Track as interaction
        this.pipeline.setContentElement(exercise.dataset.sectionId ?? '');
      });
    });

    // Track content scrolling for element visibility
    const scroller = document.getElementById('lesson-scroller')!;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = (entry.target as HTMLElement).id;
          if (id) this.pipeline.setContentElement(id);
        }
      });
    }, { root: scroller, threshold: 0.5 });

    this.lessonContent.querySelectorAll('.lesson-section').forEach(section => {
      observer.observe(section);
    });
  }

  // -------------------------------------------------------------------------
  // Pipeline callbacks
  // -------------------------------------------------------------------------

  updateCondition(state: LearningConditionState): void {
    // Update pulse indicator
    this.updatePulse(state);

    // Update explainability drawer if open
    if (this.drawerOpen) {
      this.updateDrawer(state);
    }
  }

  showIntervention(intervention: Intervention): void {
    this.currentIntervention = intervention;
    const overlay = this.interventionOverlay;

    const messageEl = overlay.querySelector('.intervention-sheet__message')!;
    const optionsEl = overlay.querySelector('.intervention-sheet__options')!;
    const confidenceEl = overlay.querySelector('.intervention-sheet__confidence')!;

    messageEl.textContent = intervention.message;
    confidenceEl.textContent = `confidence: ${Math.round(intervention.confidence * 100)}%`;

    optionsEl.innerHTML = intervention.options.map(opt => {
      let cls = 'intervention-sheet__option';
      if (opt.action === 'accept') cls += ' intervention-sheet__option--primary';
      if (opt.action === 'dismiss') cls += ' intervention-sheet__option--dismiss';
      return `<button class="${cls}" data-action="${opt.action}" data-id="${opt.id}">${opt.label}</button>`;
    }).join('');

    // Bind option clicks
    optionsEl.querySelectorAll('.intervention-sheet__option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action as 'accept' | 'dismiss' | 'alternative';
        this.handleInterventionResponse(action);
      });
    });

    overlay.classList.add('active');
  }

  private handleInterventionResponse(action: 'accept' | 'dismiss' | 'alternative'): void {
    if (this.currentIntervention) {
      this.pipeline.recordInterventionResponse(this.currentIntervention.id, action);

      // Handle accept actions
      if (action === 'accept') {
        const cls = this.currentIntervention.class;
        if (cls === 'reset') {
          this.showMicroBreak();
        }
        // Other intervention types handled by content system in production
      }
    }

    this.currentIntervention = null;
    this.interventionOverlay.classList.remove('active');
  }

  updatePolicyReasoning(reasoning: string): void {
    const el = document.getElementById('status-reasoning');
    if (el) el.textContent = reasoning;
  }

  updateTier(tier: PerceptionTier): void {
    const tierEl = document.getElementById('status-tier');
    if (tierEl) {
      const labels = ['Tier 0 · telemetry', 'Tier 1 · camera', 'Tier 2 · depth'];
      tierEl.textContent = labels[tier] ?? 'unknown';
    }
  }

  updatePerceptionState(state: PerceptionState): void {
    const el = document.getElementById('status-perception');
    if (el) el.textContent = state;
  }

  // -------------------------------------------------------------------------
  // Pulse indicator
  // -------------------------------------------------------------------------

  private updatePulse(state: LearningConditionState): void {
    const pulse = this.pulseIndicator;
    pulse.className = 'pulse-indicator';

    if (state.confidence < 0.3) {
      pulse.classList.add('pulse-indicator--off');
    } else if (state.dominant === 'attentive') {
      pulse.classList.add('pulse-indicator--steady');
    } else if (state.dominant === 'wandering' || state.dominant === 'confused') {
      pulse.classList.add('pulse-indicator--wavering');
    } else {
      pulse.classList.add('pulse-indicator--fading');
    }
  }

  // -------------------------------------------------------------------------
  // Explainability drawer
  // -------------------------------------------------------------------------

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
    this.explainabilityDrawer.classList.toggle('open', this.drawerOpen);

    if (this.drawerOpen) {
      const state = this.pipeline.getLastCondition();
      if (state) this.updateDrawer(state);
    }
  }

  private updateDrawer(state: LearningConditionState): void {
    // Conditions
    const conditionsEl = document.getElementById('drawer-conditions')!;
    conditionsEl.innerHTML = Object.entries(state.condition)
      .map(([name, prob]) => `
        <div class="explainability-drawer__condition">
          <span class="explainability-drawer__condition-name">${name}</span>
          <div class="explainability-drawer__condition-bar">
            <div class="explainability-drawer__condition-fill" style="width: ${Math.round(prob * 100)}%"></div>
          </div>
        </div>
      `).join('');

    // Confidence
    const confEl = document.getElementById('drawer-confidence')!;
    confEl.textContent = `${Math.round(state.confidence * 100)}%`;

    // Drivers
    const driversEl = document.getElementById('drawer-drivers')!;
    if (state.drivers.length > 0) {
      driversEl.innerHTML = state.drivers
        .map(d => `<div class="explainability-drawer__driver">${d.description}</div>`)
        .join('');
    } else {
      driversEl.innerHTML = '<div class="explainability-drawer__driver">No strong signals detected</div>';
    }

    // Not used
    const notUsedEl = document.getElementById('drawer-not-used')!;
    notUsedEl.innerHTML = state.not_used
      .map(n => `<div class="explainability-drawer__not-used">${n}</div>`)
      .join('');
  }

  // -------------------------------------------------------------------------
  // Camera permission dialog
  // -------------------------------------------------------------------------

  private showCameraDialog(): void {
    this.cameraDialog.classList.add('active');
  }

  private async handleCameraAllow(): Promise<void> {
    this.cameraDialog.classList.remove('active');
    await this.pipeline.initPerception();
    this.pipeline.start();
  }

  private handleCameraSkip(): void {
    this.cameraDialog.classList.remove('active');
    // Start in Tier 0
    this.pipeline.start();
  }

  // -------------------------------------------------------------------------
  // Micro-break
  // -------------------------------------------------------------------------

  private showMicroBreak(durationS = 20): void {
    this.microBreak.classList.add('active');
    const timerEl = this.microBreak.querySelector('.micro-break__timer')!;
    let remaining = durationS;

    const tick = setInterval(() => {
      remaining--;
      timerEl.textContent = `${remaining}s`;
      if (remaining <= 0) {
        clearInterval(tick);
        this.dismissMicroBreak();
      }
    }, 1000);

    timerEl.textContent = `${remaining}s`;

    // Store interval for early dismissal
    (this.microBreak as any)._interval = tick;
  }

  private dismissMicroBreak(): void {
    const tick = (this.microBreak as any)._interval;
    if (tick) clearInterval(tick);
    this.microBreak.classList.remove('active');
  }

  // -------------------------------------------------------------------------
  // Privacy controls
  // -------------------------------------------------------------------------

  private async handleCameraToggle(enabled: boolean): Promise<void> {
    await this.pipeline.toggleCamera(enabled);
  }

  // -------------------------------------------------------------------------
  // Event binding
  // -------------------------------------------------------------------------

  private bindEvents(): void {
    // Session home buttons
    document.getElementById('btn-start-lesson')?.addEventListener('click', () => {
      this.startLesson();
    });

    document.getElementById('btn-privacy')?.addEventListener('click', () => {
      this.showScreen('privacy');
    });

    // Lesson header
    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.pipeline.pause();
      this.showScreen('home');
    });

    // Pulse indicator → open drawer
    this.pulseIndicator.addEventListener('click', () => {
      this.toggleDrawer();
    });

    // Drawer close
    document.getElementById('drawer-close')?.addEventListener('click', () => {
      this.toggleDrawer();
    });

    // Camera dialog
    document.getElementById('btn-camera-allow')?.addEventListener('click', () => {
      this.handleCameraAllow();
    });

    document.getElementById('btn-camera-skip')?.addEventListener('click', () => {
      this.handleCameraSkip();
    });

    // Micro-break dismiss
    this.microBreak.querySelector('.micro-break__dismiss')?.addEventListener('click', () => {
      this.dismissMicroBreak();
    });

    // Privacy controls
    document.getElementById('btn-privacy-back')?.addEventListener('click', () => {
      this.showScreen(this.currentLesson ? 'lesson' : 'home');
    });

    document.getElementById('toggle-camera')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.handleCameraToggle(checked);
    });

    // Drawer click outside to close
    this.explainabilityDrawer.addEventListener('click', (e) => {
      if (e.target === this.explainabilityDrawer) {
        this.toggleDrawer();
      }
    });

    // Intervention overlay click outside
    this.interventionOverlay.addEventListener('click', (e) => {
      if (e.target === this.interventionOverlay) {
        this.handleInterventionResponse('dismiss');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private escapeAttr(s: string): string {
    return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
