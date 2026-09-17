import React from "react";

/* =========================================================
   GENERIC KEYBOARD NAVIGATION
========================================================= */

export interface KeyboardActionOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
}

/* =========================================================
   HANDLE KEYBOARD ACTION
========================================================= */

export const handleKeyboardAction = (
  event: React.KeyboardEvent,
  options: KeyboardActionOptions
) => {
  switch (event.key) {
    /* =====================================================
       ENTER
    ===================================================== */

    case "Enter": {
      /*
       * Shift + Enter is allowed for multiline fields.
       */
      if (event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      options.onEnter?.();

      break;
    }

    /* =====================================================
       ESCAPE
    ===================================================== */

    case "Escape": {
      event.preventDefault();
      event.stopPropagation();

      options.onEscape?.();

      break;
    }

    /* =====================================================
       LEFT
    ===================================================== */

    case "ArrowLeft": {
      options.onArrowLeft?.();
      break;
    }

    /* =====================================================
       RIGHT
    ===================================================== */

    case "ArrowRight": {
      options.onArrowRight?.();
      break;
    }

    /* =====================================================
       UP
    ===================================================== */

    case "ArrowUp": {
      options.onArrowUp?.();
      break;
    }

    /* =====================================================
       DOWN
    ===================================================== */

    case "ArrowDown": {
      options.onArrowDown?.();
      break;
    }

    default:
      break;
  }
};

/* =========================================================
   FOCUS ELEMENT
========================================================= */

export const focusElement = (
  element: HTMLElement | null
) => {
  if (!element) {
    return;
  }

  requestAnimationFrame(() => {
    element.focus();

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.select();
    }
  });
};

/* =========================================================
   FOCUS BY ID
========================================================= */

export const focusById = (
  id: string
) => {
  const element = document.getElementById(id);

  focusElement(element as HTMLElement | null);
};