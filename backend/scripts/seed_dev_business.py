"""Create a business + admin user for local dev/manual testing.

There's no self-serve signup and no /accounts router yet (organization
management is a separate, not-yet-built feature — see second-brain
Known-Issues). This script is the only way to get a first account into a
fresh dev database so the sign-in page has something real to authenticate
against.

Usage (from backend/, with the project venv active):
    python scripts/seed_dev_business.py "My Store" admin 1234
"""

from __future__ import annotations

import asyncio
import sys

from app.auth import hash_pin
from app.db import get_session, init_models, new_business
from app.models import User


async def seed(business_name: str, username: str, pin: str) -> None:
    await init_models()
    business_id = await new_business(name=business_name)
    async with get_session() as session:
        session.add(
            User(
                business_id=business_id,
                username=username,
                pin_hash=hash_pin(pin),
                role="admin",
                is_primary_admin=True,
            )
        )
        await session.commit()

    print(f"Created business {business_name!r} ({business_id})")
    print(f"Admin login -> username={username!r} pin={pin!r}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("usage: python scripts/seed_dev_business.py <business_name> <username> <pin>")
        raise SystemExit(1)

    asyncio.run(seed(sys.argv[1], sys.argv[2], sys.argv[3]))
