"""
Intel Service — downloads and caches the OpenPhish threat feed.
Refreshes every INTEL_REFRESH_HOURS hours.
"""
import asyncio
from datetime import datetime, timedelta
from urllib.parse import urlparse

import aiohttp

from app.config import settings
from app.utils.logger import log_intel, log_error, log_startup


class IntelService:
    def __init__(self):
        self._domain_blocklist: set[str] = set()
        self._last_refresh: datetime | None = None
        self._source = "openphish"
        self._refresh_task: asyncio.Task | None = None

    # ------------------------------------------------------------------ #
    #  Feed fetching                                                        #
    # ------------------------------------------------------------------ #
    async def refresh_feed(self) -> None:
        previous_count = len(self._domain_blocklist)
        new_domains: set[str] = set()

        try:
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(settings.OPENPHISH_FEED_URL) as resp:
                    if resp.status != 200:
                        log_error(f"Intel feed returned HTTP {resp.status}")
                        return
                    text = await resp.text()

            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    parsed = urlparse(line if line.startswith("http") else "http://" + line)
                    domain = parsed.netloc.split(":")[0].lower()
                    if domain:
                        new_domains.add(domain)
                except Exception:
                    continue

            added = len(new_domains - self._domain_blocklist)
            self._domain_blocklist = new_domains
            self._last_refresh = datetime.utcnow()
            log_intel(len(self._domain_blocklist), added, self._source)

        except Exception as e:
            log_error(f"Intel feed refresh failed: {e}")

    # ------------------------------------------------------------------ #
    #  Background refresh loop                                             #
    # ------------------------------------------------------------------ #
    async def _refresh_loop(self):
        while True:
            await asyncio.sleep(settings.INTEL_REFRESH_HOURS * 3600)
            await self.refresh_feed()

    async def start(self):
        log_startup("Fetching OpenPhish intel feed…")
        await self.refresh_feed()
        self._refresh_task = asyncio.create_task(self._refresh_loop())
        log_startup(
            f"Intel feed active — {len(self._domain_blocklist)} domains cached, "
            f"refresh every {settings.INTEL_REFRESH_HOURS}h ✓"
        )

    # ------------------------------------------------------------------ #
    #  Public API                                                           #
    # ------------------------------------------------------------------ #
    def check_url(self, url: str) -> tuple[bool, str]:
        """Return (is_blocked, domain)."""
        try:
            parsed = urlparse(url if url.startswith("http") else "http://" + url)
            domain = parsed.netloc.split(":")[0].lower()
        except Exception:
            return False, ""
        return domain in self._domain_blocklist, domain

    def get_status(self) -> dict:
        now = datetime.utcnow()
        needs_refresh = (
            self._last_refresh is None
            or (now - self._last_refresh) > timedelta(hours=settings.INTEL_REFRESH_HOURS)
        )
        return {
            "domains_cached": len(self._domain_blocklist),
            "last_refresh": self._last_refresh.isoformat() if self._last_refresh else None,
            "source": self._source,
            "needs_refresh": needs_refresh,
        }

    @property
    def is_ready(self) -> bool:
        return self._last_refresh is not None


# Singleton instance
intel_service = IntelService()
