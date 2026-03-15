#!/usr/bin/env python3
"""
================================================================================
  test_remote_game.py
  Stress-test: N pairs of Pong remote matches, ALL running concurrently
================================================================================

Concurrency model
-----------------
  Uses async_playwright + asyncio.gather().
  All 2*N browser sessions run inside a single event loop -- no threads,
  no greenlet issues.  Each await yields control to other coroutines, so
  30 sessions make progress simultaneously without blocking each other.

Queue anti-cross-match strategy
---------------------------------
  Within each pair, P1 joins the queue first.  The server replies with
  "waiting_for_match".  Only after that socket frame is received does P2
  join.  This guarantees P1 and P2 are paired with each other even when
  many other instances are running simultaneously.

Full UI flow per player
-----------------------
  1. Open https://<IP>:8443
  2. Click .signin  ->  LoginScreen dialog
  3. Fill user + pass  ->  submit
  4. Menu loads  ->  click "player vs remote"
  5. Backend emits waiting_for_match (P1) / match_found (both)
  6. Canvas appears  ->  game running
  7. Wait for game_over  (best of 5, MAX_SCORE = 5 server-side)
  8. Record result

Dependencies
------------
  pip install playwright
  playwright install chromium

Usage
-----
  python test_remote_game.py --ip 10.11.10.6 --csv pong_users_ui.csv --pairs 5
  python test_remote_game.py --ip 10.11.10.6 --pairs 15 --headed
  python test_remote_game.py          # interactive

CSV input  : pong_users_ui.csv  (rows where has_2fa=FALSE, status=REGISTERED)
CSV output : pong_games.csv
"""

import argparse
import asyncio
import csv
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# -------------------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------------------

BASE_URL        = "https://{ip}:8443"
INPUT_CSV       = "pong_nn_users.csv"
OUTPUT_CSV      = "pong_games.csv"
SCREENSHOT_DIR  = Path("screenshots_game")

MATCH_TIMEOUT_S = 45    # max seconds waiting for canvas after clicking remote
GAME_TIMEOUT_S  = 180   # max seconds for a best-of-5 to finish

CSV_OUT_FIELDS = [
    "pair_id", "player1", "player2",
    "p1_matched", "p2_matched",
    "p1_game_over", "p2_game_over",
    "duration_s", "status", "error_msg",
    "screenshot_p1", "screenshot_p2",
]

# -------------------------------------------------------------------------------
# Per-player result
# -------------------------------------------------------------------------------

@dataclass
class PlayerResult:
    username:   str
    matched:    bool = False
    game_over:  bool = False
    error:      str  = ""
    screenshot: str  = ""

# -------------------------------------------------------------------------------
# Screenshot helper
# -------------------------------------------------------------------------------

async def snap(page, name: str) -> str:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}_{int(time.time())}.png"
    try:
        await page.screenshot(path=str(path))
        return str(path)
    except Exception:
        return ""

# -------------------------------------------------------------------------------
# Single player coroutine
# -------------------------------------------------------------------------------

async def run_player(
    context,                    # BrowserContext — already created by the caller
    base_url: str,
    username: str,
    password: str,
    result: PlayerResult,
    p1_in_queue: asyncio.Event, # set by P1 when server confirms queue entry
    is_p1: bool,
):
    """
    Async coroutine for one player session.
    The BrowserContext is passed in so the caller can manage browser lifecycle.
    """
    page = await context.new_page()

    # ── WebSocket frame interception ──────────────────────────────────────────
    # We listen for socket.io frames to detect waiting_for_match (P1 only)
    # and game_over (both players).
    game_over_event = asyncio.get_event_loop().create_future() \
        if not hasattr(run_player, "_dummy") else None
    game_over_flag  = asyncio.Event()

    def on_ws(ws):
        def on_frame(data):
            if not isinstance(data, str) or not data.startswith("42"):
                return
            try:
                import json
                payload = json.loads(data[2:])
                if not isinstance(payload, list) or len(payload) < 1:
                    return
                event = payload[0]
                if event == "waiting_for_match" and is_p1:
                    # Server confirmed P1 is in queue -- safe for P2 to join
                    if not p1_in_queue.is_set():
                        p1_in_queue.set()
                elif event == "game_over":
                    if not game_over_flag.is_set():
                        game_over_flag.set()
            except Exception:
                pass

        ws.on("framereceived", on_frame)

    page.on("websocket", on_ws)

    try:
        # == 1. Load app ======================================================
        await page.goto(base_url, wait_until="domcontentloaded", timeout=15_000)

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
            result.error = "Could not open login dialog"
            result.screenshot = await snap(page, f"login_fail_{username}")
            return

        # == 3. Login =========================================================
        await page.fill("#user", username)
        await page.fill("#pass", password)
        await page.click("button[type='submit']")

        # == 4. Wait for menu =================================================
        try:
            await page.wait_for_selector(
                "button:has-text('remote'), button:has-text('Remote')",
                timeout=10_000,
            )
        except Exception:
            result.error = "Menu did not load after login"
            result.screenshot = await snap(page, f"menu_fail_{username}")
            return

        # == 5. Sequenced queue entry =========================================
        #
        # P1 clicks immediately, then signals P2 via p1_in_queue.
        # P2 waits for that signal before clicking.
        # This prevents cross-matching with other concurrent instances.
        #
        if is_p1:
            pass  # fall through to click below
        else:
            # Wait until P1 is confirmed in queue by the server
            try:
                await asyncio.wait_for(p1_in_queue.wait(), timeout=20)
            except asyncio.TimeoutError:
                result.error = "P1 did not enter queue within 20s"
                return

        # == 6. Click "player vs remote" ======================================
        clicked = False
        for label in ("player vs remote", "Player vs Remote", "remote", "Remote"):
            try:
                btn = page.locator(f"button:has-text('{label}')").first
                if await btn.is_visible(timeout=800):
                    await btn.click()
                    clicked = True
                    break
            except Exception:
                pass

        if not clicked:
            result.error = "Could not find 'player vs remote' button"
            result.screenshot = await snap(page, f"remote_btn_fail_{username}")
            return

        # == 7. Wait for canvas (match_found -> PongScreen) ===================
        try:
            await page.wait_for_selector("canvas", timeout=MATCH_TIMEOUT_S * 1_000)
            result.matched = True
        except Exception:
            result.error = f"match_found not received after {MATCH_TIMEOUT_S}s"
            result.screenshot = await snap(page, f"match_fail_{username}")
            return

        # == 8. Wait for game_over ============================================
        try:
            await asyncio.wait_for(game_over_flag.wait(), timeout=GAME_TIMEOUT_S)
            result.game_over = True
        except asyncio.TimeoutError:
            # Not fatal -- the match may have timed out; still record as matched
            result.error = f"game_over not received after {GAME_TIMEOUT_S}s"

        result.screenshot = await snap(page, f"end_{username}")

    except Exception as exc:
        result.error = str(exc)[:300]
        try:
            result.screenshot = await snap(page, f"error_{username}")
        except Exception:
            pass
    finally:
        await page.close()


# -------------------------------------------------------------------------------
# One pair coroutine -- two player coroutines running concurrently
# -------------------------------------------------------------------------------

async def run_pair(browser, base_url: str, pair_id: int,
                   u1: dict, u2: dict) -> dict:
    r1 = PlayerResult(u1["username"])
    r2 = PlayerResult(u2["username"])

    # P1 signals P2 when server confirms queue entry
    p1_in_queue = asyncio.Event()

    # Each player gets an isolated browser context (separate session/cookies)
    ctx1 = await browser.new_context(
        viewport={"width": 640, "height": 400},
        ignore_https_errors=True,
    )
    ctx2 = await browser.new_context(
        viewport={"width": 640, "height": 400},
        ignore_https_errors=True,
    )

    t_start = time.time()

    # Run both sessions concurrently within this pair
    await asyncio.gather(
        run_player(ctx1, base_url, u1["username"], u1["password"],
                   r1, p1_in_queue, is_p1=True),
        run_player(ctx2, base_url, u2["username"], u2["password"],
                   r2, p1_in_queue, is_p1=False),
    )

    await ctx1.close()
    await ctx2.close()

    duration = round(time.time() - t_start, 1)

    errors = []
    if r1.error:
        errors.append(f"{r1.username}: {r1.error}")
    if r2.error:
        errors.append(f"{r2.username}: {r2.error}")

    status = "OK" if (r1.matched and r2.matched) else "FAILED"

    return {
        "pair_id":      pair_id,
        "player1":      r1.username,
        "player2":      r2.username,
        "p1_matched":   "YES" if r1.matched   else "NO",
        "p2_matched":   "YES" if r2.matched   else "NO",
        "p1_game_over": "YES" if r1.game_over else "NO",
        "p2_game_over": "YES" if r2.game_over else "NO",
        "duration_s":   duration,
        "status":       status,
        "error_msg":    " | ".join(errors),
        "screenshot_p1": r1.screenshot,
        "screenshot_p2": r2.screenshot,
    }


# -------------------------------------------------------------------------------
# Main async entry point
# -------------------------------------------------------------------------------

async def async_main(base_url: str, pairs: list[tuple],
                     headed: bool, output_csv: Path):
    from playwright.async_api import async_playwright

    t_start = time.time()

    async with async_playwright() as pw:
        # One shared browser -- all pairs share it, each pair gets its own contexts
        browser = await pw.chromium.launch(
            headless=not headed,
            slow_mo=40 if headed else 0,
            args=["--ignore-certificate-errors"],
        )

        print(f"  Browser launched.  Running {len(pairs)} pair(s) concurrently...\n")

        # Launch ALL pairs at once
        tasks = [
            run_pair(browser, base_url, idx + 1, u1, u2)
            for idx, (u1, u2) in enumerate(pairs)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        await browser.close()

    # ── Collect and display results ──────────────────────────────────────────
    rows     = []
    ok_count = 0
    ko_count = 0

    for res in results:
        if isinstance(res, Exception):
            print(f"  [PAIR ERROR] {res}")
            ko_count += 1
            rows.append({f: "" for f in CSV_OUT_FIELDS} | {"status": "EXCEPTION",
                                                             "error_msg": str(res)})
            continue

        rows.append(res)
        icon = "OK" if res["status"] == "OK" else "FAIL"
        print(f"  [{res['pair_id']:>2}]  {res['player1']:<18} vs {res['player2']:<18}"
              f"  matched={res['p1_matched']}/{res['p2_matched']}"
              f"  game_over={res['p1_game_over']}/{res['p2_game_over']}"
              f"  {res['duration_s']}s  [{icon}]")
        if res["error_msg"]:
            print(f"        {res['error_msg']}")
        if res["status"] == "OK":
            ok_count += 1
        else:
            ko_count += 1

    # ── Write CSV ─────────────────────────────────────────────────────────────
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_OUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    total_duration = round(time.time() - t_start, 1)

    print()
    print("=" * 57)
    print("  RESULTS")
    print("=" * 57)
    print(f"  Pairs run    : {len(pairs)}")
    print(f"  Concurrent   : all {len(pairs)} at once")
    print(f"  OK           : {ok_count}")
    print(f"  Failed       : {ko_count}")
    print(f"  Total time   : {total_duration}s")
    print(f"  Output CSV   : {output_csv.resolve()}")
    if SCREENSHOT_DIR.exists():
        print(f"  Screenshots  : {SCREENSHOT_DIR.resolve()}/")
    print("=" * 57)

    return ko_count


# -------------------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------------------

def load_eligible_users(csv_path: Path) -> list[dict]:
    users = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("status") == "REGISTERED" and row.get("has_2fa") == "FALSE":
                users.append(row)
    return users


def prompt(text: str, default: str) -> str:
    raw = input(f"  {text} [{default}]: ").strip()
    return raw if raw else default


def gather_params():
    print()
    print("=========================================================")
    print("   Pong -- Concurrent Remote Game Stress Test")
    print("=========================================================")
    print()
    ip       = prompt("Server IP",            "127.0.0.1")
    csv_file = prompt("Users CSV",            INPUT_CSV)
    n_pairs  = prompt("Number of pairs",      "5")
    headed   = prompt("Show browsers? (y/n)", "n").lower() in ("y", "yes", "s")
    try:
        n_pairs = max(1, int(n_pairs))
    except ValueError:
        n_pairs = 5
    return ip, csv_file, n_pairs, headed


# -------------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Concurrent Pong remote match stress test using async_playwright."
    )
    parser.add_argument("--ip",     type=str)
    parser.add_argument("--csv",    type=str, default=INPUT_CSV)
    parser.add_argument("--pairs",  type=int, default=5)
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--output", type=str, default=OUTPUT_CSV)
    args = parser.parse_args()

    if args.ip:
        ip       = args.ip
        csv_file = args.csv
        n_pairs  = args.pairs
        headed   = args.headed
    else:
        ip, csv_file, n_pairs, headed = gather_params()

    base_url   = BASE_URL.format(ip=ip)
    output_csv = Path(args.output)

    try:
        from playwright.async_api import async_playwright  # noqa
    except ImportError:
        print("Playwright not installed:")
        print("  pip install playwright && playwright install chromium")
        sys.exit(1)

    users = load_eligible_users(Path(csv_file))
    if len(users) < 2:
        print(f"Need at least 2 eligible users (REGISTERED, no 2FA) in {csv_file}")
        sys.exit(1)

    available = len(users) // 2
    if n_pairs > available:
        print(f"  Only {available} pair(s) available, running {available}")
        n_pairs = available

    pairs = [(users[i * 2], users[i * 2 + 1]) for i in range(n_pairs)]

    print()
    print(f"  Frontend     : {base_url}")
    print(f"  Mode         : 1v1_remote  (best of 5)")
    print(f"  Pairs        : {n_pairs}  (all concurrent)")
    print(f"  Sessions     : {n_pairs * 2}  browser contexts")
    print(f"  Eligible     : {len(users)} users (no 2FA)")
    print(f"  Browsers     : {'visible' if headed else 'headless'}")
    print(f"  Output       : {output_csv}")
    print()

    ko = asyncio.run(async_main(base_url, pairs, headed, output_csv))
    sys.exit(1 if ko else 0)


if __name__ == "__main__":
    main()
