// Native: nothing to do. On the web, pageLifecycle.web.ts releases the database when the page is
// left, so a page kept in the browser's back/forward cache cannot block the next one.
export {};
