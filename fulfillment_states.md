# Fulfillment States

| State | Meaning | Release |
| --- | --- | --- |
| `locked` | No valid confirmation and reconciliation yet. | No |
| `review` | Overpaid or duplicate payment requires manual review. | No |
| `release` | Confirmation and reconciliation pass. | Yes |

The current demo uses `locked` and `release` directly. `review` is reserved for future merchant operations polish.
