/**
 * ============================================
 * LAYOUT CONSTANTS FOR BOTTOM NAVIGATION
 * ============================================
 *
 * The bottom navbar is a floating pill that overlays content.
 * Content can scroll underneath it.
 *
 * Use these constants for:
 * - Positioning FABs, buttons, and inputs above the navbar
 * - Adding bottom padding to scrollable content
 *
 * DO NOT use these for:
 * - Creating spacer views behind the navbar
 * - Global screen padding (let content scroll under)
 */

// Height of the floating bottom navigation pill
export const BOTTOM_NAV_HEIGHT = 56;

// Minimum safe spacing from bottom of screen to navbar
// (accounts for visual breathing room)
export const BOTTOM_NAV_SPACING = 12;

// Total height to clear when positioning elements above navbar
// Use with safe area insets: BOTTOM_NAV_TOTAL + insets.bottom
export const BOTTOM_NAV_TOTAL = BOTTOM_NAV_HEIGHT + BOTTOM_NAV_SPACING;

// Extra padding for scrollable content to ensure last items are visible
export const SCROLL_BOTTOM_PADDING = 24;
