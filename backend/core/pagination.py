from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Allow clients to request larger pages when a screen needs a full list."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 2000
