#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
  TEST MODULE — Pong User Registration via FRONTEND UI
  Playwright-based — interacts exactly as a real user would
═══════════════════════════════════════════════════════════════════════════════

Architecture
------------
  Browser  →  https://<IP>:8443/            (nginx → frontend:5173)
  Browser  →  https://<IP>:8443/auth/...    (nginx → backend:3000)

  Everything goes through nginx on port 8443.
  There is NO separate backend port to configure.

Dependencies
------------
  pip install playwright requests
  playwright install chromium

Usage
-----
  # Interactive
  python test_register_ui.py

  # Full CLI
  python test_register_ui.py --ip 10.11.10.6 --users 10 --twofa-pct 30

  # Visible browser (useful to watch what happens)
  python test_register_ui.py --ip 10.11.10.6 --users 10 --headed

  # Diagnostic only — no users created, just dumps page elements + screenshot
  python test_register_ui.py --ip 10.11.10.6 --users 0

CSV output columns
------------------
  username, password, email, birth, country, lang,
  has_2fa, backup_codes, status, error_msg, screenshot
"""

import argparse
import csv
import random
import string
import sys
import time
from datetime import date, timedelta
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL       = "https://{ip}:8443"   # nginx reverse proxy — single entry point
OUTPUT_CSV     = "pong_users_ui.csv"
SCREENSHOT_DIR = Path("screenshots")

# ISO-2 country codes present in the Pong DB
COUNTRIES = ["ES", "US", "FR", "DE", "GB", "IT", "PT", "BR", "JP", "CA",
             "AR", "MX", "NL", "SE", "PL", "AU", "KR", "CN", "RU", "NO"]

# Must match <option value="xx"> in the language dropdown of SignScreen.tsx
LANGS = ["es", "ca", "en", "fr"]

CSV_FIELDS = [
    "username", "password", "email", "birth", "country", "lang",
    "has_2fa", "backup_codes", "status", "error_msg", "screenshot"
]

# ──────────────────────────────────────────────────────────────────────────────
# Random data generators
# ──────────────────────────────────────────────────────────────────────────────

def random_username() -> str:
    """play_<7 alphanum> — fits the pattern [a-zA-Z0-9_]{3,20}"""
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=7))
    return f"play_{suffix}"

def random_password() -> str:
    """12-char password: 2 upper + 5 lower + 3 digits + 2 special"""
    chars = (
        random.choices(string.ascii_uppercase, k=2)
        + random.choices(string.ascii_lowercase, k=5)
        + random.choices(string.digits, k=3)
        + random.choices("!@#$%&*", k=2)
    )
    random.shuffle(chars)
    return "".join(chars)

def random_birth() -> str:
    """ISO date between 1975-01-01 and 2005-12-31"""
    start = date(1975, 1, 1)
    delta = (date(2005, 12, 31) - start).days
    return (start + timedelta(days=random.randint(0, delta))).isoformat()

def build_user(use_2fa: bool, country_codes: list | None = None) -> dict:
    """
    Build a randomised user dict ready to be fed to register_one_user().

    Args:
        use_2fa: Whether the user should have 2FA enabled.
        country_codes: Optional list of ISO-2 country codes to pick from.
                       Defaults to the module-level COUNTRIES list.

    Returns:
        A dict with keys: username, password, email, birth, country, lang, has_2fa.
    """
    pool     = country_codes if country_codes else COUNTRIES
    username = random_username()
    return {
        "username": username,
        "password": random_password(),
        "email":    f"{username}@test.pong",
        "birth":    random_birth(),
        "country":  random.choice(pool),
        "lang":     random.choice(LANGS),
        "has_2fa":  use_2fa,
    }

# ──────────────────────────────────────────────────────────────────────────────
# Pre-flight check — verify nginx + backend are reachable before running UI
# ──────────────────────────────────────────────────────────────────────────────

def preflight_check(base_url: str) -> list:
    """
    GET /auth/countries through nginx.
    Returns the list of country dicts on success, empty list on failure.
    The endpoint returns [{coun2_pk: "ES", coun_name: "Spain"}, ...]
    """
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    url = f"{base_url}/auth/countries"
    print(f"  Preflight — checking backend via nginx...")
    print(f"  GET {url} … ", end="", flush=True)
    try:
        r = requests.get(url, timeout=10, verify=False)
        if r.status_code == 200:
            data = r.json()
            # Backend returns [{coun2_pk, coun_name}, ...]
            # Extract ISO-2 codes
            codes = [
                item.get("coun2_pk") or item.get("code") or item.get("coun2Pk")
                for item in data
                if isinstance(item, dict)
            ]
            codes = [c.strip() for c in codes if c]
            print(f"✓  {len(codes)} countries loaded")
            return codes
        else:
            print(f"✗  HTTP {r.status_code}")
            return []
    except requests.exceptions.SSLError:
        print("✗  SSL error — using built-in country list")
        return []
    except requests.exceptions.ConnectionError:
        print(f"✗  Connection refused")
        return []
    except Exception as e:
        print(f"✗  {e}")
        return []

# ──────────────────────────────────────────────────────────────────────────────
# Diagnostic — dump visible page elements and take a screenshot
# ──────────────────────────────────────────────────────────────────────────────

def dump_page_elements(page, screenshot_dir: Path):
    """
    Print a diagnostic summary of the visible page elements and save a screenshot.

    Logs all visible buttons, elements matching sign/login CSS selectors, and
    heading tags (h1–h3) to stdout. Useful for debugging navigation failures.

    Args:
        page: Playwright Page object pointing at the loaded frontend.
        screenshot_dir: Directory where the diagnostic screenshot will be saved.
    """
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    snap = screenshot_dir / "diagnostic_initial_page.png"
    page.screenshot(path=str(snap))

    print()
    print("  ┌─── DIAGNOSTIC: visible page elements ──────────────────────")

    # Buttons
    buttons = page.locator("button").all()
    print(f"  │  Buttons ({len(buttons)}):")
    for b in buttons:
        try:
            txt = b.text_content().strip().replace("\n", " ")
            print(f"  │    {'✓' if b.is_visible() else '·'}  \"{txt}\"")
        except Exception:
            pass

    # Clickable divs with class containing 'sign' or 'login'
    for css in (".signin", ".login", "[class*='sign']", "[class*='login']"):
        els = page.locator(css).all()
        for el in els:
            try:
                txt = el.text_content().strip().replace("\n", " ")[:60]
                print(f"  │  CSS {css}: \"{txt}\"  visible={el.is_visible()}")
            except Exception:
                pass

    # Headings
    for tag in ("h1", "h2", "h3"):
        for el in page.locator(tag).all():
            try:
                print(f"  │  <{tag}>: \"{el.text_content().strip()}\"")
            except Exception:
                pass

    print(f"  │  Page title : \"{page.title()}\"")
    print(f"  │  Screenshot : {snap}")
    print("  └────────────────────────────────────────────────────────────")
    print()

# ──────────────────────────────────────────────────────────────────────────────
# Navigate to the Sign / Register screen
# ──────────────────────────────────────────────────────────────────────────────

def navigate_to_sign_screen(page) -> bool:
    """
    Two-step navigation to reach the registration form (SignScreen):

    Step 1 — Open the login dialog
             The menu has a <div class="signin"><div class="login">…</div></div>
             Clicking it renders LoginScreen (login form with #user + #pass).

    Step 2 — Click "crear cuenta" (last button in the login dialog)
             This dispatches { type: "SIGN" } → renders SignScreen.
             We confirm arrival by waiting for #email (only present in SignScreen).
    """
    from playwright.sync_api import TimeoutError as PwTimeout

    # ── STEP 1: open the login dialog ─────────────────────────────────────────
    opened = False

    # Try by CSS class first (matches real Pong HTML)
    for css in (".signin", "[class*='signin']"):
        try:
            el = page.locator(css).first
            if el.is_visible(timeout=2_000):
                el.click()
                # Login dialog contains #user (username) and #pass (password)
                page.wait_for_selector("#pass", timeout=5_000)
                opened = True
                break
        except Exception:
            pass

    # Fallback: text-based click
    if not opened:
        for label in ("Sign in", "Sign In", "Iniciar sesión", "Login", "Entrar"):
            try:
                page.locator(f"text={label}").first.click(timeout=800)
                page.wait_for_selector("#pass", timeout=4_000)
                opened = True
                break
            except Exception:
                pass

    if not opened:
        return False

    # ── STEP 2: click the "crear cuenta" button inside the login dialog ───────
    # It is the last <button> in the form, inside div.account
    # Its text comes from i18n key 'crear_cuenta' — try known translations first
    for label in ("Crear cuenta", "Crear Cuenta", "Sign up", "Register",
                  "Create account", "Crear compte", "S'inscrire"):
        try:
            btn = page.locator(f"button:has-text('{label}')").first
            if btn.is_visible(timeout=1_500):
                btn.click()
                # SignScreen has #email — LoginScreen does not. Use it as anchor.
                page.wait_for_selector("#email", timeout=5_000)
                return True
        except Exception:
            pass

    # Fallback: click the last visible button in the dialog
    try:
        buttons = page.locator("button").all()
        # Reverse order — "crear cuenta" is the last button in LoginScreen
        for btn in reversed(buttons):
            try:
                if not btn.is_visible():
                    continue
                btn.click(timeout=1_500)
                page.wait_for_selector("#email", timeout=4_000)
                txt = btn.text_content().strip()
                print(f"\n  ℹ  Sign screen reached via last button \"{txt}\"")
                return True
            except Exception:
                pass
    except Exception:
        pass

    return False

# ──────────────────────────────────────────────────────────────────────────────
# Reset to the home/menu screen between users
# ──────────────────────────────────────────────────────────────────────────────

def go_back_to_menu(page, base_url: str):
    """
    After a registration (success or failure) we need to return to the menu
    so the next user can navigate to the sign screen again.
    Try the reset button first; reload the page as fallback.
    """
    try:
        # "Borrar todo" / "Reset" button inside the form
        reset = page.locator("button[type='button']").filter(has_text="orrar").first
        if reset.is_visible(timeout=1_000):
            reset.click()
            time.sleep(0.3)
            return
    except Exception:
        pass

    # If 2FA QR is showing there may be a "go to menu" button
    try:
        go_menu = page.locator("button").filter(has_text="menú").first
        if go_menu.is_visible(timeout=800):
            go_menu.click()
            time.sleep(0.5)
            return
    except Exception:
        pass

    # Hard reload — always works
    page.goto(base_url, wait_until="domcontentloaded", timeout=10_000)

# ──────────────────────────────────────────────────────────────────────────────
# Core registration flow for one user
# ──────────────────────────────────────────────────────────────────────────────

def register_one_user(page, user: dict, base_url: str,
                      screenshot_dir: Path) -> dict:
    """
    Execute the full registration flow for a single user via the UI.

    Steps:
        1. Navigate to SignScreen (via navigate_to_sign_screen).
        2. Fill all form fields (username, email, password, birth, country, lang).
        3. Toggle the 2FA checkbox according to user["has_2fa"].
        4. Accept the Terms of Use / Privacy Policy checkbox.
        5. Submit the form and wait for server feedback.
        6. Collect backup codes if 2FA was enabled.
        7. Return to the home menu (via go_back_to_menu).

    Args:
        page: Playwright Page object with the frontend already loaded.
        user: Dict produced by build_user() with all registration fields.
        base_url: Full base URL (e.g. "https://10.0.0.1:8443") used as fallback
                  reload target in go_back_to_menu.
        screenshot_dir: Directory for saving success / error screenshots.

    Returns:
        A dict with keys: status ("REGISTERED" | "FAILED"), backup_codes,
        error_msg, and screenshot (file path string).
    """
    from playwright.sync_api import TimeoutError as PwTimeout

    username         = user["username"]
    backup_codes_str = ""
    screenshot       = ""

    try:
        # ── 1. Get to the sign screen ─────────────────────────────────────────
        if not navigate_to_sign_screen(page):
            return _fail("Could not navigate to Sign screen",
                         _snap(page, screenshot_dir, f"nav_fail_{username}"))

        # ── 2. Fill every field ──────────────────────────────────────────────
        page.fill("#user",  username)
        page.fill("#email", user["email"])
        page.fill("#pass",  user["password"])
        page.fill("#passR", user["password"])
        page.fill("#birth", user["birth"])

        # Country — select directly by ISO-2 code (dropdown already loaded)
        page.select_option("#country", value=user["country"])

        # Language
        page.select_option("#lang", value=user["lang"])

        # 2FA checkbox
        cb = page.locator("#enabled2FA")
        if user["has_2fa"] and not cb.is_checked():
            cb.check()
        elif not user["has_2fa"] and cb.is_checked():
            cb.uncheck()

        # Accept Terms of Use + Privacy Policy checkbox (mandatory since new SignScreen)
        terms_cb = page.locator("#acceptPolicy")
        if not terms_cb.is_checked():
            terms_cb.check()

        # ── 4. Submit ─────────────────────────────────────────────────────────
        page.click("button[type='submit']")

        # ── 5. Wait for any feedback ──────────────────────────────────────────
        page.wait_for_selector(
            "span[style*='color: red'], "
            "div:has-text('Logrado'), "
            "div:has-text('éxito'), "
            "div:has-text('success')",
            timeout=15_000
        )

        # ── 6. Outcome ────────────────────────────────────────────────────────
        err_el = page.locator("span[style*='color: red']").first
        if err_el.is_visible():
            return _fail(
                err_el.text_content().strip(),
                _snap(page, screenshot_dir, f"error_{username}")
            )

        # SUCCESS ✓
        if user["has_2fa"]:
            try:
                page.wait_for_selector("ul li", timeout=6_000)
                codes = page.locator("ul li").all_text_contents()
                backup_codes_str = "|".join(c.strip() for c in codes if c.strip())
            except PwTimeout:
                pass  # QR shown but no backup codes list — not fatal

        screenshot = _snap(page, screenshot_dir, f"ok_{username}")
        return {
            "status":       "REGISTERED",
            "backup_codes": backup_codes_str,
            "error_msg":    "",
            "screenshot":   screenshot,
        }

    except PwTimeout as exc:
        return _fail(f"Timeout: {exc}",
                     _snap(page, screenshot_dir, f"timeout_{username}"))
    except Exception as exc:
        return _fail(str(exc)[:300],
                     _snap(page, screenshot_dir, f"exc_{username}"))
    finally:
        go_back_to_menu(page, base_url)

# ──────────────────────────────────────────────────────────────────────────────
# Small helpers
# ──────────────────────────────────────────────────────────────────────────────

def _pick_option(page, selector: str, preferred: str) -> str | None:
    """
    Return the preferred option value if it exists in the dropdown, else a random one.

    Args:
        page: Playwright Page object.
        selector: CSS selector for the <select> element.
        preferred: The option value to look for first.

    Returns:
        The preferred value if available, a random available value, or None if
        the dropdown has no options.
    """
    opts   = page.locator(f"{selector} option[value]").all()
    values = [o.get_attribute("value") for o in opts if o.get_attribute("value")]
    if not values:
        return None
    return preferred if preferred in values else random.choice(values)

def _snap(page, directory: Path, name: str) -> str:
    """
    Take a screenshot of the current page state and save it to disk.

    Args:
        page: Playwright Page object.
        directory: Target directory (created if it does not exist).
        name: Base name for the file; a Unix timestamp is appended automatically.

    Returns:
        The file path of the saved screenshot, or an empty string on failure.
    """
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{name}_{int(time.time())}.png"
    try:
        page.screenshot(path=str(path))
        return str(path)
    except Exception:
        return ""

def _fail(msg: str, screenshot: str = "") -> dict:
    """
    Build a standardised failure result dict.

    Args:
        msg: Human-readable error message (truncated to 300 chars by callers).
        screenshot: Optional file path of the error screenshot.

    Returns:
        A dict with status="FAILED", empty backup_codes, the error message,
        and the screenshot path.
    """
    return {
        "status":       "FAILED",
        "backup_codes": "",
        "error_msg":    msg,
        "screenshot":   screenshot,
    }

# ──────────────────────────────────────────────────────────────────────────────
# Interactive setup
# ──────────────────────────────────────────────────────────────────────────────

def _prompt(text: str, default: str) -> str:
    """
    Display an interactive prompt and return the user's input, or default if empty.

    Args:
        text: Label shown before the bracketed default value.
        default: Value returned when the user presses Enter without typing.

    Returns:
        The stripped input string, or default if the input was blank.
    """
    raw = input(f"  {text} [{default}]: ").strip()
    return raw if raw else default

def gather_params_interactive():
    """
    Collect run parameters interactively via stdin prompts.

    Asks the user for server IP, number of users, 2FA percentage, and whether
    to display the browser window. Invalid numeric inputs fall back to defaults
    (5 users, 20 % 2FA).

    Returns:
        A tuple (ip: str, n: int, pct: float, headed: bool).
    """
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║   Pong — Registration UI Test  (Playwright / nginx)  ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()
    ip         = _prompt("Server IP",                           "127.0.0.1")
    n_raw      = _prompt("Number of users (0 = diagnostic)",    "5")
    pct_raw    = _prompt("Percentage with 2FA (0-100)",         "20")
    headed_raw = _prompt("Show browser window? (y/n)",          "n").lower()

    try:    n   = max(0, int(n_raw))
    except: n   = 5
    try:    pct = max(0.0, min(100.0, float(pct_raw)))
    except: pct = 20.0
    headed = headed_raw in ("y", "yes", "s", "si", "sí")

    return ip, n, pct, headed

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    """
    Entry point for the Pong registration UI test.

    Parses CLI arguments (or falls back to interactive prompts), runs a
    pre-flight reachability check against the backend, launches a Playwright
    Chromium browser, registers the requested number of users, and writes
    results to a CSV file.

    Exits with code 0 if all registrations succeeded, 1 if any failed.
    """
    parser = argparse.ArgumentParser(
        description="Register Pong users through the frontend UI using Playwright."
    )
    parser.add_argument("--ip",           type=str,             help="Server IP")
    parser.add_argument("--users",        type=int,             help="Users to create (0 = diagnostic only)")
    parser.add_argument("--twofa-pct",    type=float,           help="Percentage with 2FA (0-100)")
    parser.add_argument("--headed",       action="store_true",  help="Run with visible browser")
    parser.add_argument("--no-preflight", action="store_true",  help="Skip backend reachability check")
    parser.add_argument("--output",       type=str, default=OUTPUT_CSV)
    parser.add_argument("--screenshots",  type=str, default="screenshots")
    args = parser.parse_args()

    if args.ip and args.users is not None:
        ip     = args.ip
        n      = args.users
        pct    = args.twofa_pct if args.twofa_pct is not None else 20.0
        headed = args.headed
    else:
        ip, n, pct, headed = gather_params_interactive()

    base_url       = BASE_URL.format(ip=ip)
    output_csv     = Path(args.output)
    screenshot_dir = Path(args.screenshots)

    # Build user list with correct 2FA distribution
    n_2fa  = round(n * pct / 100)
    flags  = [True] * n_2fa + [False] * (n - n_2fa)
    random.shuffle(flags)
    users  = [build_user(f, COUNTRIES) for f in flags]

    print()
    print("┌──────────────────────────────────────────────────────┐")
    print(f"│  Entry point : {base_url:<37}│")
    print(f"│  Users       : {('diagnostic only' if n == 0 else str(n)):<37}│")
    print(f"│  With 2FA    : {n_2fa} ({pct:.0f} %)                              │"[:56] + "│")
    print(f"│  Browser     : {'visible' if headed else 'headless':<37}│")
    print(f"│  Output CSV  : {str(output_csv):<37}│")
    print("└──────────────────────────────────────────────────────┘")
    print()

    # Pre-flight — fetch real country codes from the backend
    country_codes = COUNTRIES   # safe default
    if not args.no_preflight:
        country_codes = preflight_check(base_url)
        if not country_codes:
            print()
            print("  ⚠  Could not load countries from backend.")
            print("     Possible causes:")
            print("     • nginx not running or port 8443 closed")
            print("     • /auth/countries not proxied in nginx.conf")
            print("     • country table empty in the database")
            print()
            print("  Falling back to built-in country list and continuing...")
            country_codes = COUNTRIES   # use hardcoded fallback
        print()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌  Playwright not installed. Run:")
        print("      pip install playwright && playwright install chromium")
        sys.exit(1)

    rows       = []
    ok_count   = 0
    fail_count = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=not headed,
            slow_mo=60 if headed else 0,
            args=["--ignore-certificate-errors"],   # accept self-signed SSL
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()

        # ── Load the app ──────────────────────────────────────────────────────
        print(f"  Opening {base_url} …")
        try:
            page.goto(base_url, wait_until="domcontentloaded", timeout=10_000)
        except Exception as e:
            print(f"  ❌  Cannot load frontend: {e}")
            browser.close()
            sys.exit(1)
        print("  Frontend loaded ✓")

        # Always run diagnostics on first load
        dump_page_elements(page, screenshot_dir)

        if n == 0:
            print("  --users 0 → diagnostic only, no registrations.")
            browser.close()
            return

        # ── Register users ────────────────────────────────────────────────────
        for idx, user in enumerate(users, start=1):
            label = "2FA" if user["has_2fa"] else "   "
            sys.stdout.write(f"  [{idx:>3}/{n}] {label}  {user['username']:<18} … ")
            sys.stdout.flush()

            result = register_one_user(page, user, base_url, screenshot_dir)

            icon = "✓" if result["status"] == "REGISTERED" else "✗"
            print(f"{icon}  {result['status']}")
            if result["error_msg"]:
                print(f"           ↳ {result['error_msg']}")

            rows.append({
                "username":     user["username"],
                "password":     user["password"],
                "email":        user["email"],
                "birth":        user["birth"],
                "country":      user["country"],
                "lang":         user["lang"],
                "has_2fa":      "TRUE" if user["has_2fa"] else "FALSE",
                "backup_codes": result["backup_codes"],
                "status":       result["status"],
                "error_msg":    result["error_msg"],
                "screenshot":   result["screenshot"],
            })

            if result["status"] == "REGISTERED":
                ok_count += 1
            else:
                fail_count += 1

        browser.close()

    # ── Write CSV ─────────────────────────────────────────────────────────────
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("═══════════════════════════════════════════════════════")
    print("  TEST RESULTS")
    print("═══════════════════════════════════════════════════════")
    print(f"  Total attempted : {n}")
    print(f"  ✓  Registered   : {ok_count}")
    print(f"  ✗  Failed       : {fail_count}")
    print(f"  Output CSV      : {output_csv.resolve()}")
    if screenshot_dir.exists():
        print(f"  Screenshots     : {screenshot_dir.resolve()}/")
    print("═══════════════════════════════════════════════════════")
    print()

    sys.exit(1 if fail_count else 0)


if __name__ == "__main__":
    main()
