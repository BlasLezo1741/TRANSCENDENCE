#!/usr/bin/env python3
"""
================================================================================
  stress_remote_game.py
  Stress test: N users authenticate and request a remote match concurrently.
  The backend owns all pairing logic -- this script just floods the queue.
================================================================================

Strategy
--------
  N coroutines launch simultaneously via asyncio.gather().
  Each one independently:
    1. Loads the frontend
    2. Authenticates
    3. Clicks "player vs remote"  ->  join_queue emitted to backend
    4. Waits for match_found      ->  backend paired this user with someone
    5. Waits for game_over        ->  best of 5 finished
    6. Closes context and records result

  No pairing logic in the script. The backend empties the queue by itself.
  With N=60 users, 30 simultaneous game loops run at 60fps each.

Browser layout
--------------
  Windows are sized 640x400 and placed in a 3x2 non-overlapping grid.
  With more than 6 browsers, positions cycle through the 6 slots.
  This lets you watch up to 6 games simultaneously without overlap.

  Slot grid (pixels):
    (   0,   0)  (640,   0)  (1280,   0)
    (   0, 400)  (640, 400)  (1280, 400)

Dependencies
------------
  pip install playwright
  playwright install chromium

Usage
-----
  python stress_remote_game.py --ip 10.11.10.6 --csv pong_users_ui.csv
  python stress_remote_game.py --ip 10.11.10.6 --users 30
  python stress_remote_game.py          # interactive
  python stress_remote_game.py --headless  # no windows

CSV input  : pong_users_ui.csv  (rows where has_2fa=FALSE, status=REGISTERED)
CSV output : stress_results.csv
"""

import argparse
import asyncio
import csv
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# -------------------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------------------

BASE_URL       = "https://{ip}:8443"
INPUT_CSV      = "pong_users_ui.csv"
OUTPUT_CSV     = "stress_results.csv"

LOGIN_TIMEOUT  = 15_000   # ms
MENU_TIMEOUT   = 10_000   # ms
MATCH_TIMEOUT  = 60_000   # ms  -- queue may take longer with many users
GAME_TIMEOUT   = 300      # seconds -- generous upper bound for best-of-5
STAGGER_MS     = 300      # ms between session startups (avoids WS handshake flood)

# 3x2 grid of non-overlapping 640x400 slots
WINDOW_W = 640
WINDOW_H = 400
SLOTS = [
    (0,    0),   (640,    0),  (1280,    0),
    (0,  400),   (640,  400),  (1280,  400),
]

CSV_FIELDS = [
    "index", "username",
    "logged_in", "matched", "game_over",
    "queue_wait_s", "game_duration_s", "total_s",
    "status", "error",
]

# -------------------------------------------------------------------------------
# Per-session result
# -------------------------------------------------------------------------------

@dataclass
class SessionResult:
    index:          int
    username:       str
    logged_in:      bool  = False
    matched:        bool  = False
    game_over:      bool  = False
    queue_wait_s:   float = 0.0   # time from clicking remote to match_found
    game_duration_s:float = 0.0   # time from match_found to game_over
    total_s:        float = 0.0
    status:         str   = "FAILED"
    error:          str   = ""

# -------------------------------------------------------------------------------
# Single user coroutine
# -------------------------------------------------------------------------------

async def run_session(
    browser,          # the browser instance for this slot (already positioned)
    base_url: str,
    index: int,
    username: str,
    password: str,
    headed: bool,
) -> SessionResult:

    res = SessionResult(index=index, username=username)
    t_start = time.monotonic()

    # Each context shares the browser window of its slot
    context = await browser.new_context(
        viewport={"width": WINDOW_W, "height": WINDOW_H},
        ignore_https_errors=True,
    )
    page = await context.new_page()

    # -- WebSocket interception -----------------------------------------------
    matched_event       = asyncio.Event()
    game_over_event     = asyncio.Event()
    queue_joined_event  = asyncio.Event()  # set when server confirms join_queue

    def on_ws(ws):
        def on_frame(raw):
            if not isinstance(raw, str) or not raw.startswith("42"):
                return
            try:
                payload = json.loads(raw[2:])
                if not isinstance(payload, list) or len(payload) < 1:
                    return
                event = payload[0]
                if event == "waiting_for_match" and not queue_joined_event.is_set():
                    # Server confirmed our join_queue was received and processed
                    queue_joined_event.set()
                elif event == "match_found" and not matched_event.is_set():
                    # Also counts as queue joined (matched immediately, no waiting)
                    queue_joined_event.set()
                    matched_event.set()
                elif event == "game_over" and not game_over_event.is_set():
                    game_over_event.set()
                elif event == "opponent_disconnected" and not game_over_event.is_set():
                    game_over_event.set()
            except Exception:
                pass

        ws.on("framereceived", on_frame)

    page.on("websocket", on_ws)

    try:
        # == 1. Load app ======================================================
        await page.goto(base_url, wait_until="domcontentloaded",
                        timeout=LOGIN_TIMEOUT)

        # Wait for React to mount -- .signin lives in Header and is always
        # rendered once React mounts, regardless of screen or login state.
        try:
            await page.wait_for_selector(".signin", timeout=10_000)
        except Exception:
            res.error = "React did not mount (.signin not found after 10s)"
            return res

        # == 2. Open login dialog =============================================
        opened = False
        for css in (".signin", "[class*='signin']"):
            try:
                el = page.locator(css).first
                if await el.is_visible(timeout=3_000):
                    await el.click()
                    await page.wait_for_selector("#pass", timeout=5_000)
                    opened = True
                    break
            except Exception:
                pass

        if not opened:
            res.error = "login dialog not found"
            return res

        # == 3. Login =========================================================
        await page.fill("#user", username)
        await page.fill("#pass", password)
        await page.click("button[type='submit']")

        # MenuScreen renders a <section> containing the mode buttons.
        # The buttons have class "btn" (defined in App.css).
        # We wait for the first "btn" button to appear -- this proves
        # the menu is rendered and isAuthenticated will soon be true.
        # NOTE: .home is the header logo link (App.css), NOT the menu.
        try:
            await page.wait_for_selector("section .btn", timeout=MENU_TIMEOUT)
            res.logged_in = True
        except Exception:
            res.error = "menu did not load after login (section .btn not found)"
            return res

        # == 4. Click "player vs remote" and confirm via WebSocket
        #
        # Selector: section .btn nth(2) — 3rd button in MenuScreen's <section>
        #   [0] player_vs_ia
        #   [1] player_vs_player
        #   [2] player_vs_remote  <-- this one
        # Language-independent. Works for en/es/ca/fr.
        #
        # Confirmation: we wait for the server to emit either
        #   "waiting_for_match"  (socket connected, in queue, no partner yet)
        #   "match_found"        (socket connected, matched immediately)
        # Both events are set on queue_joined_event by the WS frame parser.
        # This is the only reliable signal that joinQueue() actually reached
        # the backend -- DOM checks are unreliable with Tailwind + i18n.
        #
        # Retry: if socket wasn't connected yet (connectSocket runs async after
        # profile fetch), wait 1.5s and try again. Max 5 attempts.
        #
        async def click_remote() -> bool:
            try:
                btn = page.locator("section .btn").nth(2)
                if await btn.is_visible(timeout=3_000):  # generous for slow renders
                    await btn.click()
                    return True
            except Exception:
                pass
            return False

        queued = False
        for attempt in range(8):  # up from 5 -- more tolerance for slow socket handshake
            if not await click_remote():
                res.error = "remote button not found in section .btn (attempt {})".format(attempt + 1)
                return res

            # Wait up to 3s for WS confirmation that joinQueue reached the server
            try:
                await asyncio.wait_for(queue_joined_event.wait(), timeout=3.0)
                queued = True
                break
            except asyncio.TimeoutError:
                # Socket not yet connected or isAuthenticated still false — retry
                queue_joined_event.clear()
                await asyncio.sleep(1.5)

        if not queued:
            res.error = "join_queue not confirmed by server after 5 attempts"
            return res

        t_queued = time.monotonic()

        # == 5. Wait for match_found ==========================================
        try:
            await asyncio.wait_for(matched_event.wait(), timeout=MATCH_TIMEOUT / 1000)
            res.matched      = True
            res.queue_wait_s = round(time.monotonic() - t_queued, 1)
        except asyncio.TimeoutError:
            res.error = f"match_found not received after {MATCH_TIMEOUT//1000}s"
            return res

        t_matched = time.monotonic()

        # == 6. Wait for game_over ============================================
        # Option B: detect via WebSocket frame, then close -- no modal click
        try:
            await asyncio.wait_for(game_over_event.wait(), timeout=GAME_TIMEOUT)
            res.game_over       = True
            res.game_duration_s = round(time.monotonic() - t_matched, 1)
        except asyncio.TimeoutError:
            res.error = f"game_over not received after {GAME_TIMEOUT}s"

    except Exception as exc:
        res.error = str(exc)[:200]
    finally:
        res.total_s = round(time.monotonic() - t_start, 1)
        res.status  = "OK" if (res.matched and res.game_over) else "FAILED"
        await context.close()

    return res

# -------------------------------------------------------------------------------
# Main async body
# -------------------------------------------------------------------------------

async def async_main(base_url: str, users: list[dict],
                     headed: bool, output_csv: Path):
    global STAGGER_MS
    from playwright.async_api import async_playwright

    n = len(users)
    t_start = time.monotonic()

    async with async_playwright() as pw:
        # One browser per slot, each launched at the correct screen position.
        # --window-position is the only reliable way to place Chromium windows.
        browsers = []
        for slot_x, slot_y in SLOTS:
            b = await pw.chromium.launch(
                headless=not headed,
                slow_mo=0,
                args=[
                    "--ignore-certificate-errors",
                    f"--window-position={slot_x},{slot_y}",
                    f"--window-size={WINDOW_W},{WINDOW_H}",
                ],
            )
            browsers.append(b)

        print(f"  {len(browsers)} browsers launched — staggering {n} sessions "
              f"({STAGGER_MS}ms apart)...\n")

        # Wrap each coroutine with a startup delay proportional to its index.
        # This staggers the WebSocket handshakes so the server is not hit by
        # N simultaneous connections -- the root cause of missed match_found.
        async def staggered(i, u):
            await asyncio.sleep(i * STAGGER_MS / 1000)
            return await run_session(browsers[i % len(SLOTS)], base_url, i,
                                     u["username"], u["password"], headed)

        tasks = [staggered(i, u) for i, u in enumerate(users)]
        results: list[SessionResult] = await asyncio.gather(
            *tasks, return_exceptions=False
        )

        for b in browsers:
            await b.close()

    # ── Display & CSV ─────────────────────────────────────────────────────────
    ok = sum(1 for r in results if r.status == "OK")
    matched_count = sum(1 for r in results if r.matched)
    gameover_count = sum(1 for r in results if r.game_over)
    total_elapsed = round(time.monotonic() - t_start, 1)

    # Per-session summary (only failures and a sample of successes)
    print(f"  {'#':>3}  {'username':<20}  {'login':^5}  {'match':^5}  "
          f"{'over':^5}  {'q_wait':>6}  {'game':>6}  {'total':>6}  status")
    print("  " + "-" * 75)
    for r in results:
        print(f"  {r.index:>3}  {r.username:<20}  "
              f"{'Y' if r.logged_in else 'N':^5}  "
              f"{'Y' if r.matched   else 'N':^5}  "
              f"{'Y' if r.game_over else 'N':^5}  "
              f"{r.queue_wait_s:>5.1f}s  "
              f"{r.game_duration_s:>5.1f}s  "
              f"{r.total_s:>5.1f}s  "
              f"{r.status}"
              + (f"  [{r.error}]" if r.error else ""))

    # Write CSV
    rows = [
        {
            "index":           r.index,
            "username":        r.username,
            "logged_in":       "YES" if r.logged_in  else "NO",
            "matched":         "YES" if r.matched     else "NO",
            "game_over":       "YES" if r.game_over   else "NO",
            "queue_wait_s":    r.queue_wait_s,
            "game_duration_s": r.game_duration_s,
            "total_s":         r.total_s,
            "status":          r.status,
            "error":           r.error,
        }
        for r in results
    ]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print()
    print("=" * 57)
    print("  STRESS TEST RESULTS")
    print("=" * 57)
    print(f"  Users launched   : {n}")
    print(f"  Logged in        : {sum(1 for r in results if r.logged_in)}")
    print(f"  Matched          : {matched_count}  ({matched_count/2} matches playeed)")
    print(f"  Game over        : {gameover_count}")
    print(f"  Full OK          : {ok}")
    print(f"  Failed           : {n - ok}")
    print(f"  Total elapsed    : {total_elapsed}s")
    print(f"  Output CSV       : {output_csv.resolve()}")
    print("=" * 57)

    return n - ok

# -------------------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------------------

def load_eligible(csv_path: Path) -> list[dict]:
    users = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("status") == "REGISTERED" and row.get("has_2fa") == "FALSE":
                users.append(row)
    return users


def prompt(text: str, default: str) -> str:
    raw = input(f"  {text} [{default}]: ").strip()
    return raw if raw else default

# -------------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------------

def main():
    global STAGGER_MS
    parser = argparse.ArgumentParser(
        description="Flood the Pong remote queue with N concurrent users."
    )
    parser.add_argument("--ip",       type=str)
    parser.add_argument("--csv",      type=str, default=INPUT_CSV)
    parser.add_argument("--users",    type=int, help="Max users to load from CSV")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--stagger",  type=int, default=STAGGER_MS,
                        help=f"ms between session startups (default: {STAGGER_MS})")
    parser.add_argument("--output",   type=str, default=OUTPUT_CSV)
    args = parser.parse_args()

    if args.ip:
        ip       = args.ip
        csv_file = args.csv
        n_users  = args.users or None
        headed   = not args.headless
    else:
        print()
        print("=========================================================")
        print("   Pong -- Remote Queue Stress Test")
        print("=========================================================")
        print()
        ip       = prompt("Server IP",              "127.0.0.1")
        csv_file = prompt("Users CSV",              INPUT_CSV)
        n_raw    = prompt("Max users (0 = all)",    "60")
        headed   = prompt("Show browsers? (y/n)",   "y").lower() in ("y","yes","s")
        try:    n_users = int(n_raw) or None
        except: n_users = None

    base_url   = BASE_URL.format(ip=ip)
    output_csv = Path(args.output if args.ip else OUTPUT_CSV)

    try:
        from playwright.async_api import async_playwright  # noqa
    except ImportError:
        print("Playwright not installed:")
        print("  pip install playwright && playwright install chromium")
        sys.exit(1)

    users = load_eligible(Path(csv_file))
    if not users:
        print(f"No eligible users (REGISTERED, no 2FA) found in {csv_file}")
        sys.exit(1)

    if n_users:
        users = users[:n_users]

    # Odd number: drop the last user so the queue empties cleanly
    if len(users) % 2 != 0:
        dropped = users.pop()
        print(f"  Odd number of users -- dropping {dropped['username']} "
              f"so queue pairs evenly")

    STAGGER_MS = args.stagger   # must be set before print and before asyncio.run
    print()
    print(f"  Frontend     : {base_url}")
    print(f"  Users        : {len(users)}  ({len(users)//2} expected matches)")
    print(f"  Stagger      : {STAGGER_MS}ms between sessions")
    print(f"  Browsers     : {'visible  (3x2 grid, 640x400 each)' if headed else 'headless'}")
    print(f"  Output       : {output_csv}")
    print()

    ko = asyncio.run(async_main(base_url, users, headed, output_csv))
    sys.exit(1 if ko else 0)


if __name__ == "__main__":
    main()
