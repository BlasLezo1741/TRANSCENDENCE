#!/usr/bin/env python3
"""
================================================================================
  testone_remote_game.py
  Watch a complete Pong 1v1 remote match -- two players, three screenshots each
================================================================================

Screenshots taken at:
  1. After the 1st point is scored
  2. After the 3rd point is scored
  3. At final result (game_over modal appears)

How score is tracked
--------------------
  The server emits socket.io frames like:
    42["game_update_physics", {"ball":{...}, "score":[2,1], "paddles":{...}}]
  Playwright's WebSocket interception reads these frames in real time.
  When the total score (left + right) increases we know a point was scored.

Dependencies
------------
  pip install playwright
  playwright install chromium

Usage
-----
  python testone_remote_game.py --ip 10.11.10.6 --p1 alice --pw1 Pass1! --p2 bob --pw2 Pass2!

  Or interactive (no args needed):
  python testone_remote_game.py

  Browsers are shown by default so you can watch the match.
  Use --headless to run without windows.

Output
------
  screenshots_match/  -- 6 PNG files (3 per player)
  match_result.csv    -- single row with match summary
"""

import argparse
import csv
import json
import sys
import re
import threading
import time
import random
from pathlib import Path

# -------------------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------------------

BASE_URL        = "https://{ip}:8443"
SCREENSHOT_BASE = Path("screenshots")
OUTPUT_CSV      = "match_result.csv"

MATCH_TIMEOUT_S = 45     # max seconds to wait for match_found after clicking remote
GAME_TIMEOUT_S  = 300    # max seconds for a best-of-5 (generous upper bound)

CSV_FIELDS = [
    "player1", "player2",
    "matched", "game_over_detected",
    "final_score", "duration_s",
    "status", "error_msg",
    "screenshots",
]

# -------------------------------------------------------------------------------
# Score tracker -- shared between both player threads
# -------------------------------------------------------------------------------

class ScoreTracker:
    """
    Parses socket.io game_update_physics frames and tracks score milestones.
    Thread-safe via a lock.
    """
    def __init__(self):
        self._lock       = threading.Lock()
        self._score      = [0, 0]       # [left, right]
        self._total      = 0
        self.milestones  = set()        # {1, 3} -- points at which to screenshot
        self.game_over   = threading.Event()
        self.score_event = threading.Event()  # fires on any score change

    def feed_frame(self, raw: str):
        """Called from the WebSocket frame callback."""
        # socket.io text frames start with "42" followed by JSON array
        if not raw.startswith("42"):
            return
        try:
            payload = json.loads(raw[2:])
            if not isinstance(payload, list) or len(payload) < 2:
                return
            event, data = payload[0], payload[1]

            if event == "game_update_physics" and "score" in data:
                new_score = data["score"]
                new_total = new_score[0] + new_score[1]
                with self._lock:
                    if new_total > self._total:
                        self._total  = new_total
                        self._score  = new_score
                        self.milestones.add(new_total)
                        self.score_event.set()
                        self.score_event.clear()

            elif event == "game_over":
                self.game_over.set()

        except (json.JSONDecodeError, IndexError, KeyError, TypeError):
            pass

    @property
    def current_score(self):
        with self._lock:
            return list(self._score)

    @property
    def total_points(self):
        with self._lock:
            return self._total


# -------------------------------------------------------------------------------
# Screenshot helper
# -------------------------------------------------------------------------------

def snap(page, label: str, directory: Path) -> str:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{label}.png"
    try:
        page.screenshot(path=str(path), full_page=False)
        print(f"    [screenshot] {path}")
        return str(path)
    except Exception as e:
        print(f"    [screenshot FAILED] {label}: {e}")
        return ""


# -------------------------------------------------------------------------------
# Single player session
# -------------------------------------------------------------------------------

def run_player(
    base_url: str,
    username: str,
    password: str,
    player_tag: str,        # "p1" or "p2"
    tracker: ScoreTracker,
    barrier: threading.Barrier,
    headed: bool,
    result: dict,           # mutated in-place
    shot_dir: Path = None,  # per-match screenshot directory
):
    """
    Full browser session for one player.
    Each thread owns its own sync_playwright instance.
    """
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

    pw = browser = context = page = None
    screenshots = []

    try:
        pw      = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=not headed,
            slow_mo=30 if headed else 0,
            args=["--ignore-certificate-errors"],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()

        # -- Intercept WebSocket frames to feed the score tracker -------------
        def on_ws(ws):
            # framereceived passes the payload directly as str or bytes, NOT a dict
            def on_frame(data):
                if isinstance(data, str):
                    tracker.feed_frame(data)
                elif isinstance(data, (bytes, bytearray)):
                    try:
                        tracker.feed_frame(data.decode("utf-8", errors="ignore"))
                    except Exception:
                        pass
            ws.on("framereceived", on_frame)

        page.on("websocket", on_ws)

        # == STEP 1: Load app =================================================
        page.goto(base_url, wait_until="domcontentloaded", timeout=15_000)

        # == STEP 2: Open login dialog ========================================
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
            result["error"] = "Could not open login dialog"
            return

        # == STEP 3: Login ====================================================
        page.fill("#user", username)
        page.fill("#pass", password)
        page.click("button[type='submit']")

        # == STEP 4: Wait for menu ============================================
        try:
            page.wait_for_selector(
                "button:has-text('remote'), button:has-text('Remote')",
                timeout=10_000,
            )
        except PwTimeout:
            result["error"] = "Menu did not appear after login"
            screenshots.append(snap(page, f"{player_tag}_login_fail", shot_dir))
            return

        # == STEP 5: Barrier -- both at menu before clicking remote ===========
        try:
            barrier.wait(timeout=20)
        except threading.BrokenBarrierError:
            result["error"] = "Partner failed to reach menu in time"
            return

        # == STEP 6: Click "player vs remote" =================================
        clicked = False
        for label in ("player vs remote", "Player vs Remote", "remote", "Remote"):
            try:
                btn = page.locator(f"button:has-text('{label}')").first
                if btn.is_visible(timeout=1_000):
                    btn.click()
                    clicked = True
                    break
            except Exception:
                pass

        if not clicked:
            result["error"] = "Could not find 'player vs remote' button"
            screenshots.append(snap(page, f"{player_tag}_btn_fail", shot_dir))
            return

        # == STEP 7: Wait for canvas (match_found received) ===================
        try:
            page.wait_for_selector("canvas", timeout=MATCH_TIMEOUT_S * 1_000)
            result["matched"] = True
            print(f"    [{username}] matched -- canvas visible")
        except PwTimeout:
            result["error"] = f"match_found not received after {MATCH_TIMEOUT_S}s"
            screenshots.append(snap(page, f"{player_tag}_match_fail", shot_dir))
            return

        # == STEP 8: Watch the match, screenshot at milestones ================
        #
        # We poll the tracker's milestone set.
        # After each new point we check if we should screenshot.
        # Milestones: total==1 (1st point), total==3 (3rd point)
        #
        snapped_at = set()
        deadline   = time.time() + GAME_TIMEOUT_S

        while time.time() < deadline:
            total = tracker.total_points
            score = tracker.current_score

            # Screenshot after 1st point
            if total >= 1 and 1 not in snapped_at:
                time.sleep(0.3)   # let canvas redraw
                path = snap(page, f"{player_tag}_score_1pt_{score[0]}_{score[1]}", shot_dir)
                screenshots.append(path)
                snapped_at.add(1)

            # Screenshot after 3rd point
            if total >= 3 and 3 not in snapped_at:
                time.sleep(0.3)
                path = snap(page, f"{player_tag}_score_3pt_{score[0]}_{score[1]}", shot_dir)
                screenshots.append(path)
                snapped_at.add(3)

            # Game over detected via WebSocket
            if tracker.game_over.is_set():
                time.sleep(0.8)   # let the modal render
                path = snap(page, f"{player_tag}_final_{score[0]}_{score[1]}", shot_dir)
                screenshots.append(path)
                result["game_over"] = True
                result["final_score"] = f"{score[0]}-{score[1]}"
                break

            time.sleep(0.1)

        else:
            # Timeout -- take a final screenshot anyway
            score = tracker.current_score
            path = snap(page, f"{player_tag}_timeout_{score[0]}_{score[1]}", shot_dir)
            screenshots.append(path)
            result["error"] = f"Match did not finish within {GAME_TIMEOUT_S}s"

    except PwTimeout as exc:
        result["error"] = f"Playwright timeout: {exc}"
        if page:
            screenshots.append(snap(page, f"{player_tag}_timeout_err", shot_dir))
    except Exception as exc:
        result["error"] = str(exc)[:300]
        if page:
            screenshots.append(snap(page, f"{player_tag}_exception", shot_dir))
    finally:
        result["screenshots"] = screenshots
        for obj, method in [(context, "close"), (browser, "close"), (pw, "stop")]:
            if obj is not None:
                try:
                    getattr(obj, method)()
                except Exception:
                    pass


# -------------------------------------------------------------------------------
# Run the match
# -------------------------------------------------------------------------------

def run_match(base_url: str, p1: dict, p2: dict, headed: bool) -> dict:
    tracker = ScoreTracker()
    barrier = threading.Barrier(2, timeout=25)

    # Create a unique subdirectory for this match
    match_id  = time.strftime("%Y%m%d_%H%M%S")
    shot_dir  = SCREENSHOT_BASE / f"match_{match_id}_{p1['username']}_vs_{p2['username']}"
    shot_dir.mkdir(parents=True, exist_ok=True)
    print(f"  Screenshots -> {shot_dir}/")

    r1 = {"matched": False, "game_over": False,
          "final_score": "", "error": "", "screenshots": []}
    r2 = {"matched": False, "game_over": False,
          "final_score": "", "error": "", "screenshots": []}

    t1 = threading.Thread(
        target=run_player,
        args=(base_url, p1["username"], p1["password"],
              "p1", tracker, barrier, headed, r1, shot_dir),
        daemon=True,
    )
    t2 = threading.Thread(
        target=run_player,
        args=(base_url, p2["username"], p2["password"],
              "p2", tracker, barrier, headed, r2, shot_dir),
        daemon=True,
    )

    t_start = time.time()
    print(f"\n  Starting sessions for  {p1['username']}  vs  {p2['username']}")
    t1.start()
    t2.start()
    t1.join(timeout=MATCH_TIMEOUT_S + GAME_TIMEOUT_S + 30)
    t2.join(timeout=MATCH_TIMEOUT_S + GAME_TIMEOUT_S + 30)
    duration = round(time.time() - t_start, 1)

    matched   = r1["matched"] and r2["matched"]
    game_over = r1["game_over"] or r2["game_over"]
    score     = r1["final_score"] or r2["final_score"] or "?"

    errors = []
    if r1["error"]:
        errors.append(f"{p1['username']}: {r1['error']}")
    if r2["error"]:
        errors.append(f"{p2['username']}: {r2['error']}")

    all_shots = r1["screenshots"] + r2["screenshots"]

    return {
        "player1":            p1["username"],
        "player2":            p2["username"],
        "matched":            "YES" if matched   else "NO",
        "game_over_detected": "YES" if game_over else "NO",
        "final_score":        score,
        "duration_s":         duration,
        "status":             "OK" if matched else "FAILED",
        "error_msg":          " | ".join(errors),
        "screenshots":        " ; ".join(all_shots),
    }


# -------------------------------------------------------------------------------
# Load users from CSV
# -------------------------------------------------------------------------------

def load_eligible(csv_path: Path):
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("status") == "REGISTERED" and row.get("has_2fa") == "FALSE":
                rows.append(row)
    return rows


# -------------------------------------------------------------------------------
# Interactive prompts
# -------------------------------------------------------------------------------

def prompt(text: str, default: str) -> str:
    raw = input(f"  {text} [{default}]: ").strip()
    return raw if raw else default


# -------------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Watch one complete Pong remote match with score-triggered screenshots."
    )
    parser.add_argument("--ip",       type=str, help="Server IP")
    parser.add_argument("--p1",       type=str, help="Player 1 username")
    parser.add_argument("--pw1",      type=str, help="Player 1 password")
    parser.add_argument("--p2",       type=str, help="Player 2 username")
    parser.add_argument("--pw2",      type=str, help="Player 2 password")
    parser.add_argument("--csv",      type=str, help="Pick users from CSV instead")
    parser.add_argument("--headless", action="store_true",
                        help="Run without visible browsers (default: headed)")
    parser.add_argument("--output",   type=str, default=OUTPUT_CSV)
    args = parser.parse_args()

    # Resolve credentials
    if args.ip and args.p1 and args.pw1 and args.p2 and args.pw2:
        ip = args.ip
        p1 = {"username": args.p1, "password": args.pw1}
        p2 = {"username": args.p2, "password": args.pw2}
    elif args.ip and args.csv:
        ip    = args.ip
        users = load_eligible(Path(args.csv))
        if len(users) < 2:
            print(f"Need at least 2 eligible users in {args.csv}")
            sys.exit(1)
        p1, p2 = users[0], users[1]
    else:
        print()
        print("=======================================================")
        print("  testone_remote_game -- interactive setup")
        print("=======================================================")
        print()
        #ip = prompt("Server IP", "127.0.0.1")
        ip = "127.0.0.1"        
        #use_csv = prompt("Load users from CSV? (y/n)", "y").lower() in ("y", "yes")
        use_csv = True
        
        if use_csv:
            #csv_path = prompt("CSV file", "pong_users_ui.csv")
            csv_path = "pong_nn_users.csv"
            users    = load_eligible(Path(csv_path))
            if len(users) < 2:
                print(f"Need at least 2 eligible users in {csv_path}")
                sys.exit(1)
            print(f"\n  Available players (no 2FA):")
            for i, u in enumerate(users):
                print(f"    {i}: {u['username']}")
            #i1 = int(prompt("\n  Index of player 1", "0"))
            #i2 = int(prompt("  Index of player 2", "1"))
            i1= random.randint(1, 30)
            i2 =random.randint(1, 30)
            p1, p2 = users[i1], users[i2]
        else:
            p1 = {"username": prompt("Player 1 username", ""),
                  "password": prompt("Player 1 password", "")}
            p2 = {"username": prompt("Player 2 username", ""),
                  "password": prompt("Player 2 password", "")}

    headed  = not args.headless
    base_url = BASE_URL.format(ip=ip)
    output_csv = Path(args.output)

    # Check Playwright
    try:
        import playwright  # noqa
    except ImportError:
        print("Playwright not installed:")
        print("  pip install playwright && playwright install chromium")
        sys.exit(1)

    print()
    print("=======================================================")
    print(f"  {p1['username']}  vs  {p2['username']}")
    print(f"  Server   : {base_url}")
    print(f"  Mode     : 1v1_remote  best of 5")
    print(f"  Browsers : {'visible (watching live)' if headed else 'headless'}")
    print(f"  Shots at : 1st point, 3rd point, game over")
    print("=======================================================")

    result = run_match(base_url, p1, p2, headed)

    # Write CSV
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerow(result)

    print()
    print("=======================================================")
    print("  RESULT")
    print("=======================================================")
    print(f"  Matched        : {result['matched']}")
    print(f"  Game over      : {result['game_over_detected']}")
    print(f"  Final score    : {result['final_score']}")
    print(f"  Duration       : {result['duration_s']}s")
    print(f"  Status         : {result['status']}")
    if result["error_msg"]:
        print(f"  Errors         : {result['error_msg']}")
    print(f"  Screenshots    : {shot_dir.resolve()}/")
    for s in result["screenshots"].split(" ; "):
        if s:
            print(f"    {s}")
    print(f"  CSV            : {output_csv.resolve()}")
    print("=======================================================")

    sys.exit(0 if result["status"] == "OK" else 1)


if __name__ == "__main__":
    main()
