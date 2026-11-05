// Web only (imported by the .web.ts keyboard hooks): keys typed into a text field stay normal typing.

/** Whether a key event's target is somewhere the user types text (the note, a form field). */
export function isTextField(target: EventTarget | null): boolean {
  return (
    typeof HTMLElement !== 'undefined' &&
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  );
}
