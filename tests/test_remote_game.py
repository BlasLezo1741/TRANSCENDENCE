#!/usr/bin/env python3
"""
================================================================================
  TEST MODULE -- Pong Remote Game via Frontend UI
  Two concurrent Playwright sessions simulate a real 1v1 remote match
================================================================================

Full UI flow per player
-----------------------
  1. Open https://<IP>:8443
  2. Click .signin  ->  LoginScreen
  3. Fill username + password  ->  submit
  4. Menu loads  ->  click "player vs remote"
  5. Status shows "searching_player..."  (join_queue emitted via socket)
  6. Backend pairs the two players  ->  match_found  ->  PongScreen + <canvas>
  7. Wait for game_over  (best of 5 -- MAX_SCORE = 5 on the server)
  8. Record result

IMPORTANT -- Playwright threading model
----------------------------------------
  Playwright sync API uses greenlets internally and CANNOT be shared across
  OS threads. Each thread must call sync_playwright().start() independently.

Dependencies
------------
  pip install playwright
  playwright install chromium

Usage
-----
  python test_remote_game.py
  python test_remote_game.py --ip 10.11.10.6 --csv pong_users_ui.csv --pairs 2
  python test_remote_game.py --ip 10.11.10.6 --pairs 2 --headed

CSV input  : pong_users_ui.csv  (uses rows where has_2fa=FALSE, status=REGISTERED)
CSV output : pong_games.csv
"""

import argparse
import csv
import sys
import threading
import time
from pathlib import Path

# -------------------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------------------

BASE_URL        = "https://{ip}:8443"
INPUT_CSV       = "pong_users_ui.csv"
OUTPUT_CSV      = "pong_games.csv"
SCREENSHOT_DIR  = Path("screenshots_game")

MATCH_TIMEOUT_S = 40     # max seconds waiting for match_found (canvas appears)
GAME_TIMEOUT_S  = 180    # max seconds for a best-of-5 match to finish

CSV_OUT_FIELDS = [
    "player1", "player2",
    "p1_matched", "p2_matched",
    "p1_game_over", "p2_game_over",
    "duration_s", "status", "error_msg",
    "screenshot_p1", "screenshot_p2",
]

# -------------------------------------------------------------------------------
# Per-player result container
# -------------------------------------------------------------------------------

class PlayerResult:
    def __init__(self, username):
        self.username   = username
        self.matched    = False
        self.game_over  = False
        self.error      = ""
        self.screenshot = ""

# -------------------------------------------------------------------------------
# Screenshot helper (must be called from the owning thread)
# -------------------------------------------------------------------------------

def take_screenshot(page, name):
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}_{int(time.time())}.png"
    try:
        page.screenshot(path=str(path))
        return str(path)
    except Exception:
        return ""

# -------------------------------------------------------------------------------
# Single player session -- runs entirely inside one thread
# -------------------------------------------------------------------------------

def run_player(base_url, username, password, result,
               queue_barrier, headed):
    """
    Each thread creates its own sync_playwright instance.
    This is the only correct way to use Playwright from multiple threads.
    """
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

    pw      = None
    browser = None
    context = None
    page    = None

    try:
        pw      = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=not headed,
            slow_mo=50 if headed else 0,
            args=["--ignore-certificate-errors"],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()

        # -- 1. Load the app --------------------------------------------------
        page.goto(base_url, wait_until="domcontentloaded", timeout=15_000)

        # -- 2. Open login dialog (.signin div) -------------------------------
        opened = False
        for css in (".signin", "[class*='signin']"):
            try:
                el = page.locator(css).first
                if el.is_visible(timeout=3_000):
                    el.click()
                    page.wait_for_selector("#pass", timeout=5_000)
                    opened = True
                    break
            except Exception:
                pass

        if not opened:
            result.error = "Could not open login dialog"
            result.screenshot = take_screenshot(page, f"login_open_fail_{username}")
            return

        # -- 3. Fill login form -----------------------------------------------
        page.fill("#user", username)
        page.fill("#pass", password)
        page.click("button[type='submit']")

        # -- 4. Wait for menu (remote button appears) -------------------------
        try:
            page.wait_for_selector(
                "button:has-text('remote'), button:has-text('Remote')",
                timeout=10_000
            )
        except PwTimeout:
            result.error = "Menu did not load after login"
            result.screenshot = take_screenshot(page, f"menu_fail_{username}")
            return

        # -- 5. Barrier: both players must reach the menu before clicking -----
        try:
            queue_barrier.wait(timeout=20)
        except threading.BrokenBarrierError:
            result.error = "Barrier timeout -- partner session failed to reach menu"
            return

        # -- 6. Click "player vs remote" button -------------------------------
        clicked = False
        for label in ("player vs remote", "Player vs Remote",
                      "remote", "Remote", "1v1 remote"):
            try:
                btn = page.locator(f"button:has-text('{label}')").first
                if btn.is_visible(timeout=1_000):
                    btn.click()
                    clicked = True
                    break
            except Exception:
                pass

        if not clicked:
            result.error = "Could not find 'player vs remote' button"
            result.screenshot = take_screenshot(page, f"remote_btn_fail_{username}")
            return

        # -- 7. Wait for match -- canvas appears when PongScreen renders ------
        try:
            page.wait_for_selector("canvas", timeout=MATCH_TIMEOUT_S * 1_000)
            result.matched = True
        except PwTimeout:
            result.error = f"match_found not received after {MATCH_TIMEOUT_S}s"
            result.screenshot = take_screenshot(page, f"match_fail_{username}")
            return

        # -- 8. Wait for game_over (best of 5, MAX_SCORE=5) -------------------
        # Detect any of:
        #   A) Score text "5" appears
        #   B) Element with class game_over / winner
        #   C) Canvas disappears (App.tsx dispatched MENU after game_over)
        try:
            page.wait_for_function(
                """() => {
                    const leaves = [...document.querySelectorAll('*')]
                        .filter(el => el.children.length === 0);
                    for (const el of leaves) {
                        if (/\\b5\\b/.test(el.textContent || '')) return true;
                    }
                    if (document.querySelector(
                        '[class*="game_over"],[class*="winner"],[class*="gameover"]'))
                        return true;
                    if (!document.querySelector('canvas')) return true;
                    return false;
                }""",
                timeout=GAME_TIMEOUT_S * 1_000
            )
            result.game_over = True
        except PwTimeout:
            result.error = f"game_over not detected after {GAME_TIMEOUT_S}s"

        result.screenshot = take_screenshot(page, f"end_{username}")

    except PwTimeout as exc:
        result.error = f"Timeout: {exc}"
        if page:
            result.screenshot = take_screenshot(page, f"timeout_{username}")
    except Exception as exc:
        result.error = str(exc)[:300]
        if page:
            result.screenshot = take_screenshot(page, f"error_{username}")
    finally:
        for obj in (context, browser, pw):
            if obj is not None:
                try:
                    if hasattr(obj, "close"):
                        obj.close()
                    elif hasattr(obj, "stop"):
                        obj.stop()
                except Exception:
                    pass

# -------------------------------------------------------------------------------
# Run one pair (two concurrent threads)
# -------------------------------------------------------------------------------

def run_pair(base_url, u1, u2, headed):
    r1 = PlayerResult(u1["username"])
    r2 = PlayerResult(u2["username"])

    # Both threads must reach the menu before either clicks "remote"
    barrier = threading.Barrier(2, timeout=25)

    t1 = threading.Thread(
        target=run_player,
        args=(base_url, u1["username"], u1["password"], r1, barrier, headed),
        daemon=True,
    )
    t2 = threading.Thread(
        target=run_player,
        args=(base_url, u2["username"], u2["password"], r2, barrier, headed),
        daemon=True,
    )

    t_start = time.time()
    t1.start()
    t2.start()
    t1.join(timeout=MATCH_TIMEOUT_S + GAME_TIMEOUT_S + 30)
    t2.join(timeout=MATCH_TIMEOUT_S + GAME_TIMEOUT_S + 30)
    duration = round(time.time() - t_start, 1)

    errors = []
    if r1.error:
        errors.append(f"{r1.username}: {r1.error}")
    if r2.error:
        errors.append(f"{r2.username}: {r2.error}")

    status = "OK" if (r1.matched and r2.matched) else "FAILED"

    return {
        "player1":       r1.username,
        "player2":       r2.username,
        "p1_matched":    "YES" if r1.matched   else "NO",
        "p2_matched":    "YES" if r2.matched   else "NO",
        "p1_game_over":  "YES" if r1.game_over else "NO",
        "p2_game_over":  "YES" if r2.game_over else "NO",
        "duration_s":    duration,
        "status":        status,
        "error_msg":     " | ".join(errors),
        "screenshot_p1": r1.screenshot,
        "screenshot_p2": r2.screenshot,
    }

# -------------------------------------------------------------------------------
# Load eligible users from CSV
# -------------------------------------------------------------------------------

def load_eligible_users(csv_path):
    users = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("status") == "REGISTERED" and row.get("has_2fa") == "FALSE":
                users.append(row)
    return users

# -------------------------------------------------------------------------------
# Interactive prompts
# -------------------------------------------------------------------------------

def prompt(text, default):
    raw = input(f"  {text} [{default}]: ").strip()
    return raw if raw else default

def gather_params():
    print()
    print("=========================================================")
    print("   Pong -- Remote Game UI Test  (Playwright)")
    print("=========================================================")
    print()
    ip       = prompt("Server IP",            "127.0.0.1")
    csv_file = prompt("Users CSV",            INPUT_CSV)
    n_pairs  = prompt("Number of pairs",      "2")
    headed   = prompt("Show browsers? (y/n)", "n").lower() in ("y", "yes", "s")
    try:
        n_pairs = max(1, int(n_pairs))
    except ValueError:
        n_pairs = 2
    return ip, csv_file, n_pairs, headed

# -------------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Test Pong remote 1v1 matches via the frontend UI."
    )
    parser.add_argument("--ip",     type=str)
    parser.add_argument("--csv",    type=str, default=INPUT_CSV)
    parser.add_argument("--pairs",  type=int, default=2)
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

    # Check playwright is installed
    try:
        import playwright  # noqa: F401
    except ImportError:
        print("Playwright not installed:")
        print("  pip install playwright && playwright install chromium")
        sys.exit(1)

    # Load users
    users = load_eligible_users(Path(csv_file))
    if len(users) < 2:
        print(f"Need at least 2 eligible users (REGISTERED + no 2FA) in {csv_file}")
        sys.exit(1)

    available = len(users) // 2
    if n_pairs > available:
        print(f"  Only {available} pair(s) available, running {available}")
        n_pairs = available

    pairs = [(users[i * 2], users[i * 2 + 1]) for i in range(n_pairs)]

    print()
    print(f"  Frontend  : {base_url}")
    print(f"  Mode      : 1v1_remote (best of 5)")
    print(f"  Pairs     : {n_pairs}")
    print(f"  Eligible  : {len(users)} users (no 2FA)")
    print(f"  Browsers  : {'visible' if headed else 'headless'}")
    print(f"  Output    : {output_csv}")
    print()

    rows     = []
    ok_count = 0
    ko_count = 0

    for idx, (u1, u2) in enumerate(pairs, start=1):
        print(f"  [Pair {idx}/{n_pairs}]  {u1['username']}  vs  {u2['username']}")

        result = run_pair(base_url, u1, u2, headed)

        icon = "OK" if result["status"] == "OK" else "FAIL"
        print(f"    matched  P1={result['p1_matched']}  P2={result['p2_matched']}")
        print(f"    game_over P1={result['p1_game_over']}  P2={result['p2_game_over']}")
        print(f"    duration {result['duration_s']}s  [{icon}]")
        if result["error_msg"]:
            print(f"    error: {result['error_msg']}")
        print()

        rows.append(result)
        if result["status"] == "OK":
            ok_count += 1
        else:
            ko_count += 1

    # Write CSV
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_OUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print("=========================================================")
    print("  RESULTS")
    print("=========================================================")
    print(f"  Pairs tested : {n_pairs}")
    print(f"  OK           : {ok_count}")
    print(f"  Failed       : {ko_count}")
    print(f"  Output CSV   : {output_csv.resolve()}")
    if SCREENSHOT_DIR.exists():
        print(f"  Screenshots  : {SCREENSHOT_DIR.resolve()}/")
    print("=========================================================")

    sys.exit(1 if ko_count else 0)


if __name__ == "__main__":
    main()
