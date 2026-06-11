"""
AuditMiddleware — stores the current request in thread-local storage
so that signals can access actor/IP without receiving the request object.
"""
import threading

_thread_locals = threading.local()


def get_current_user():
    request = get_current_request()
    if request is not None:
        user = getattr(request, 'user', None)
        if getattr(user, 'is_authenticated', False):
            return user
        return None
    return getattr(_thread_locals, 'user', None)


def get_current_request():
    return getattr(_thread_locals, 'request', None)


def get_current_company():
    request = get_current_request()
    if request is not None:
        return getattr(request, 'tenant', None)
    return getattr(_thread_locals, 'company', None)


class AuditMiddleware:
    """
    Stores the live request object so later code can read the current
    authenticated user and tenant after DRF JWT authentication runs.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        _thread_locals.user = None
        _thread_locals.company = None
        try:
            response = self.get_response(request)
        finally:
            # Always clear to avoid leaking between requests in the same thread
            _thread_locals.request = None
            _thread_locals.user = None
            _thread_locals.company = None
        return response
