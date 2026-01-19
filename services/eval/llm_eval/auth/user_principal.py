from fastapi import Header, HTTPException
from pydantic.dataclasses import dataclass


@dataclass
class UserPrincipal:
    id: str
    name: str
    email: str | None


async def get_user_from_headers(
    user_id: str | None = Header(None, alias="X-User-Id"),
    user_name: str | None = Header(None, alias="X-User-Name"),
    user_email: str | None = Header(None, alias="X-User-Email"),
) -> UserPrincipal:
    """
    Extract user context from trusted C4 backend headers.

    This service is internal and trusts the C4 backend completely.
    Authentication is enforced by C4 backend - this function just
    extracts the user context for audit trails.

    Args:
        user_id: User ID from X-User-Id header
        user_name: User name from X-User-Name header
        user_email: User email from X-User-Email header (optional)

    Returns:
        UserPrincipal with user context

    Raises:
        HTTPException: If required headers are missing
    """
    if not user_id or not user_name:
        raise HTTPException(
            status_code=400,
            detail="Missing required user headers. This service must be accessed via C4 backend proxy.",
        )

    return UserPrincipal(id=user_id, name=user_name, email=user_email)
