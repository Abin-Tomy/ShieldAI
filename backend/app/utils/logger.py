import sys
import io
from datetime import datetime

# Force UTF-8 output on Windows to avoid cp1252 UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ANSI color codes
RESET   = "\033[0m"
BOLD    = "\033[1m"
CYAN    = "\033[96m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
MAGENTA = "\033[95m"
BLUE    = "\033[94m"
WHITE   = "\033[97m"
DIM     = "\033[2m"


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def print_banner():
    banner = (
        f"\n{CYAN}{BOLD}"
        f"+======================================+\n"
        f"|        ShieldAI v2  --  ONLINE       |\n"
        f"|   Autonomous Threat Detection        |\n"
        f"+======================================+"
        f"{RESET}\n"
    )
    print(banner, flush=True)


def log_scan(engine: str, is_threat: bool, input_value: str, confidence: float, action: str):
    """Log a completed scan result."""
    engine_tag = f"[{engine.upper():8s}]"
    if is_threat:
        threat_tag = f"{RED}[THREAT]{RESET}"
    else:
        threat_tag = f"{GREEN}[SAFE  ]{RESET}"

    action_color = {
        "block": RED,
        "quarantine": YELLOW,
        "warn": MAGENTA,
        "watch": BLUE,
    }.get(action.lower(), WHITE)

    line = (
        f"{DIM}[{_ts()}]{RESET} "
        f"{CYAN}{engine_tag}{RESET} "
        f"{threat_tag} "
        f"{WHITE}{input_value}{RESET} "
        f"{BOLD}{confidence*100:.0f}%{RESET} "
        f"→ {action_color}{action.upper()}{RESET}"
    )
    print(line, flush=True)


def log_intel(domains_count: int, new_count: int, source: str = "openphish"):
    line = (
        f"{DIM}[{_ts()}]{RESET} "
        f"{CYAN}[INTEL   ]{RESET} "
        f"{GREEN}FEED UPDATED{RESET} "
        f"{WHITE}{domains_count} domains (+{new_count} new) source={source}{RESET}"
    )
    print(line, flush=True)


def log_macl(engine: str, label: int, source: str, weight: float):
    line = (
        f"{DIM}[{_ts()}]{RESET} "
        f"{CYAN}[MACL    ]{RESET} "
        f"{YELLOW}SAMPLE QUEUED{RESET} "
        f"engine={engine} label={label} source={source} weight={weight}"
    )
    print(line, flush=True)


def log_startup(message: str):
    print(f"{DIM}[{_ts()}]{RESET} {GREEN}[STARTUP ]{RESET} {WHITE}{message}{RESET}", flush=True)


def log_error(message: str):
    print(f"{DIM}[{_ts()}]{RESET} {RED}[ERROR   ]{RESET} {WHITE}{message}{RESET}", file=sys.stderr, flush=True)


def log_info(message: str):
    print(f"{DIM}[{_ts()}]{RESET} {BLUE}[INFO    ]{RESET} {WHITE}{message}{RESET}", flush=True)
