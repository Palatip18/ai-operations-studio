# Support Analytics QA

## Measurement purpose

The internal dashboard answers four recurring operating questions:

1. How many customer interactions occurred in the selected day, week, or month?
2. Which issue types were most common?
3. What share was answered automatically versus sent for review?
4. Which team should receive each recurring issue and what should it improve?

## Metric definitions

| Metric | Definition |
|---|---|
| Total interactions | Completed support events inside the selected rolling window |
| Auto-responded | Events with final decision `AUTO_RESPOND` |
| Escalated | Events with final decision `ESCALATE` |
| Automation rate | Auto-responded divided by total interactions |
| Top issue | Intent with the highest event count in the selected window |
| Issue share | Intent count divided by total interactions |

All cards, trends, and issue rows use the same filtered event set so totals reconcile.

## Privacy boundary

Analytics events contain timestamp, intent, risk, decision, response language, and responsible destination only. They do not contain customer messages, User IDs, phone numbers, transaction references, uploaded images, or trace payloads.

## Routing model

Examples include:

- deposit/withdrawal → Payments Operations;
- promotion/turnover → CRM & Promotions;
- game/round issue → Game Operations;
- technical troubleshooting → Technical Support;
- security/privacy → Security & Risk;
- unclassified request → AI Quality & Knowledge.

The dispatch action is simulated. It creates a structured queued report and recipient list but does not send email, notify a real team, or create an external ticket.

## Honest prototype limitation

The dashboard combines seeded fictional 30-day history with live demo events stored in a bounded in-memory collection. Serverless instances do not share or durably retain this state. Production implementation requires a persistent event store, retention policy, access controls, scheduled aggregation, and authenticated reporting connectors.
