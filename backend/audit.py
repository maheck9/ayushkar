"""Audit log: timestamps, endpoint, a hash of the request and the provision IDs cited.
Never the content itself. In-memory for the prototype (per server instance)."""
import hashlib
import json
from collections import deque
from datetime import datetime, timezone

_log = deque(maxlen=200)


def record(endpoint, payload, provision_ids=()):
    body = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    _log.appendleft({
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "endpoint": endpoint,
        "request_sha256": hashlib.sha256(body).hexdigest(),
        "bytes": len(body),
        "provisions": sorted(set(provision_ids)),
    })


def entries():
    return list(_log)
