# Collaboration authorization

Every collaboration connection is authorized when it joins a lesson and before
each inbound message is handled. The server also revalidates every active
lesson connection independently every 5 seconds by default, including clients
that are silent in that lesson.

After membership is revoked, an otherwise idle connection is closed within one
configured revalidation interval plus one configured authorization timeout,
even if the authorization query never settles. With the defaults, that maximum
is exactly 10,000 milliseconds: a 5,000 millisecond interval plus a 5,000
millisecond timeout. Authorization denials, lookup failures, and timeouts fail
closed. Set `COLLAB_AUTH_REVALIDATION_INTERVAL_MS` between 1,000 and 60,000
milliseconds and `COLLAB_AUTH_REVALIDATION_TIMEOUT_MS` between 1,000 and 10,000
milliseconds. The configured maximum is their sum.

An initial lesson policy denial is distinct from token authentication failure:
the authorization hook rejects with code `4403` and reason
`Lesson access denied.`. Hocuspocus sends that reason in its authentication
failure protocol response rather than closing the WebSocket. A later policy
denial closes with code `4403` and reason `Lesson access revoked.`. A lookup
failure or deadline closes with code `1011` and reason
`Lesson authorization unavailable.`.

This is intentionally a single-process mechanism and uses no shared cache or
Redis. Each active lesson connection performs one authorization query per
interval, in addition to the existing query for every inbound message. The
query selects by the lesson primary key and joins membership through its
`(course_id, user_id)` primary key. Each connection has at most one
authorization query in flight. Inbound authorization shares an existing
periodic query, and a timed-out query is never replaced while its connection is
being closed.
