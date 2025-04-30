class BaseServiceError(Exception):
    """Base class for all service-related exceptions."""
    pass


class NotFoundError(BaseServiceError):
    """raised on resource is not found"""
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found")


class ValidationError(BaseServiceError):
    """raised if validation fails"""
    def __init__(self, message: str):
        super().__init__(message)


class PermissionError(BaseServiceError):
    """raised permission error"""
    def __init__(self, message: str):
        super().__init__(message)