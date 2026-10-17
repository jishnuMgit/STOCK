import { useEffect, useRef, useState } from "react";

/* =========================================================
   WIDTH OF THE SCROLL BAR OF A SCROLLING BOX

   A grid in a box with `overflow-auto` loses ~15px of its width to the vertical
   scroll bar once it has more rows than fit. A table placed UNDER it (the totals
   row) has no scroll bar, so its columns end up ~15px wider and the last box
   sticks out past the grid. `width` is that scroll bar's width (0 while there is
   none, and with overlay scroll bars): give the lower table the same amount as
   right padding and the columns line up again.

   Usage:
     const gridScroll = useScrollbarWidth<HTMLDivElement>();
     <div ref={gridScroll.ref} className="overflow-auto ..."> <table>...</table> </div>
     <div style={{ paddingRight: gridScroll.width }}> <table>... totals ...</table> </div>
========================================================= */

export function useScrollbarWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  const measure = () => {
    const element = ref.current;

    if (!element) return;

    const style = getComputedStyle(element);
    const borders =
      parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);

    setWidth(Math.max(0, element.offsetWidth - element.clientWidth - borders));
  };

  // after every render (a row added or removed changes whether there is a scroll
  // bar; the value is only stored when it differs, so this is cheap)
  useEffect(() => {
    measure();
  });

  // and when the box or its table is resized without a render (the window)
  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    if (element.firstElementChild) {
      observer.observe(element.firstElementChild);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
