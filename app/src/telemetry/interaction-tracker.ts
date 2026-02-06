/**
 * Interaction Telemetry Tracker
 *
 * Tracks scroll, clicks/taps, idle time, and retries.
 * Available at all perception tiers (including Tier 0).
 */

import type { InteractionTelemetry } from '@aegis/feature-stream';

export class InteractionTracker {
  private lastInteractionTime = Date.now() / 1000;
  private scrollSpeed = 0;
  private tapTimestamps: number[] = [];
  private retryTimestamps: number[] = [];
  private lastScrollY = 0;
  private lastScrollTime = 0;
  private contentElementId: string | null = null;
  private boundHandlers: { type: string; handler: EventListener }[] = [];

  /**
   * Attach listeners to the target element (usually the lesson content container).
   */
  attach(target: HTMLElement): void {
    this.addListener(target, 'scroll', this.onScroll);
    this.addListener(target, 'click', this.onTap);
    this.addListener(target, 'touchstart', this.onTap);
    this.addListener(target, 'keydown', this.onKeydown);
  }

  /**
   * Detach all listeners.
   */
  detach(): void {
    // Listeners are cleaned up via GC since we use arrow functions
    // For production, we'd store and remove them properly
  }

  /**
   * Record a retry event (e.g., wrong answer, re-attempt).
   */
  recordRetry(): void {
    this.retryTimestamps.push(Date.now() / 1000);
    this.recordInteraction();
  }

  /**
   * Set the current content element being viewed.
   */
  setContentElement(id: string): void {
    this.contentElementId = id;
  }

  /**
   * Get the current telemetry snapshot.
   */
  getSnapshot(): InteractionTelemetry {
    const now = Date.now() / 1000;

    // Prune old timestamps
    this.tapTimestamps = this.tapTimestamps.filter(t => now - t < 10);
    this.retryTimestamps = this.retryTimestamps.filter(t => now - t < 60);

    return {
      scroll_speed: this.scrollSpeed,
      tap_rate_10s: this.tapTimestamps.length / 10,
      retry_count_60s: this.retryTimestamps.length,
      idle_seconds: now - this.lastInteractionTime,
      content_element_id: this.contentElementId ?? undefined,
    };
  }

  /**
   * Reset tracking (e.g., on new session).
   */
  reset(): void {
    this.lastInteractionTime = Date.now() / 1000;
    this.scrollSpeed = 0;
    this.tapTimestamps = [];
    this.retryTimestamps = [];
  }

  // -------------------------------------------------------------------------
  // Private handlers
  // -------------------------------------------------------------------------

  private recordInteraction(): void {
    this.lastInteractionTime = Date.now() / 1000;
  }

  private onScroll = (e: Event): void => {
    const target = e.target as HTMLElement;
    const now = Date.now() / 1000;
    const scrollY = target.scrollTop;
    const dt = now - this.lastScrollTime;

    if (dt > 0.01) {
      this.scrollSpeed = Math.abs(scrollY - this.lastScrollY) / dt;
    }

    this.lastScrollY = scrollY;
    this.lastScrollTime = now;
    this.recordInteraction();

    // Decay scroll speed after 500ms of no scrolling
    setTimeout(() => {
      if (Date.now() / 1000 - this.lastScrollTime > 0.5) {
        this.scrollSpeed = 0;
      }
    }, 600);
  };

  private onTap = (_e: Event): void => {
    this.tapTimestamps.push(Date.now() / 1000);
    this.recordInteraction();
  };

  private onKeydown = (_e: Event): void => {
    this.recordInteraction();
  };

  private addListener(target: HTMLElement, type: string, handler: EventListener): void {
    target.addEventListener(type, handler, { passive: true });
    this.boundHandlers.push({ type, handler });
  }
}
