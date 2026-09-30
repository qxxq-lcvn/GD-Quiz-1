/*
 * Unity Quiz — connection settings.
 *
 * API_URL is the Web app URL of the Google Apps Script in server/Code.gs
 * (it ends in /exec). See "Results backend" in README.md.
 * The class codes and admin code are set in server/Code.gs, not here, so students
 * can't read them from the page source.
 */
window.QUIZ = window.QUIZ || {};

window.QUIZ.CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzAiVSgA5p5njF_yrv2D5uX-H9L_E2p4mf5mTyD7rBqKV2zZrhrH4NlxYsrYfn8fk-t/exec"
};
