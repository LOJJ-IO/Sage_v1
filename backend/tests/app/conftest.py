from __future__ import annotations

import pytest

from app.db import reset_db


@pytest.fixture(autouse=True)
async def clean_db():
    await reset_db()
    yield
    await reset_db()
