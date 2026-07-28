"""Fixed eval set of representative boutique-retail questions (build plan §10).

Run before any store pilot — see `run_eval.py`. Each case seeds its own
documents into a fresh business so the set is self-contained and repeatable.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SeedDoc:
    file_id: str
    text: str


@dataclass(frozen=True)
class EvalCase:
    id: str
    question: str
    seed_docs: list[SeedDoc]
    expect_refusal: bool
    expect_keywords: list[str] = field(default_factory=list)
    expect_citation_file: str | None = None


RETURN_POLICY = SeedDoc(
    file_id="return-policy.pdf",
    text=(
        "Return Policy: Items may be returned within 14 days of purchase with a valid receipt "
        "for a full refund. Sale items are final sale and cannot be returned. Store credit is "
        "issued for returns without a receipt, at the current selling price."
    ),
)

STORE_HOURS = SeedDoc(
    file_id="store-hours.pdf",
    text=(
        "Store Hours: Monday to Saturday 10am to 8pm. Sunday 12pm to 6pm. "
        "The store is closed on Thanksgiving, Christmas Day, and New Year's Day."
    ),
)

LOYALTY_PROGRAM = SeedDoc(
    file_id="loyalty-program.pdf",
    text=(
        "Loyalty Program: Customers earn 1 point per dollar spent. 100 points can be redeemed "
        "for a $5 store credit. Points expire 12 months after they are earned. Sign-up is free "
        "at checkout."
    ),
)

SHIPPING_POLICY = SeedDoc(
    file_id="shipping-policy.pdf",
    text=(
        "Shipping: Online orders over $50 ship free within 5-7 business days. Orders under $50 "
        "have a flat $6.99 shipping fee. We do not currently ship internationally."
    ),
)

EVAL_CASES: list[EvalCase] = [
    EvalCase(
        id="return-window",
        question="How many days do customers have to return an item?",
        seed_docs=[RETURN_POLICY],
        expect_refusal=False,
        expect_keywords=["14 days"],
        expect_citation_file="return-policy.pdf",
    ),
    EvalCase(
        id="sale-item-returns",
        question="Can a customer return a sale item?",
        seed_docs=[RETURN_POLICY],
        expect_refusal=False,
        expect_keywords=["final sale"],
        expect_citation_file="return-policy.pdf",
    ),
    EvalCase(
        id="sunday-hours",
        question="What time does the store open on Sundays?",
        seed_docs=[STORE_HOURS],
        expect_refusal=False,
        expect_keywords=["12pm"],
        expect_citation_file="store-hours.pdf",
    ),
    EvalCase(
        id="loyalty-points-value",
        question="How much store credit do 100 loyalty points give a customer?",
        seed_docs=[LOYALTY_PROGRAM],
        expect_refusal=False,
        expect_keywords=["$5"],
        expect_citation_file="loyalty-program.pdf",
    ),
    EvalCase(
        id="shipping-threshold",
        question="What's the minimum order for free shipping?",
        seed_docs=[SHIPPING_POLICY],
        expect_refusal=False,
        expect_keywords=["$50"],
        expect_citation_file="shipping-policy.pdf",
    ),
    EvalCase(
        id="out-of-scope-refusal",
        question="What is the store's stance on cryptocurrency payments and interstellar shipping?",
        seed_docs=[RETURN_POLICY, STORE_HOURS],
        expect_refusal=True,
    ),
    EvalCase(
        id="no-docs-refusal",
        question="Do you price-match competitors?",
        seed_docs=[],
        expect_refusal=True,
    ),
]
