class DomainError(Exception):
    """Business-rule failure mapped to an HTTP status by the API layer."""

    def __init__(self, detail: str, status_code: int) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)
