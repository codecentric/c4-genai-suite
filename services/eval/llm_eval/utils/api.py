from typing import Annotated, Optional

from fastapi import Depends, Header
from pydantic.dataclasses import dataclass

from llm_eval.auth.user_principal import UserPrincipal


@dataclass
class PaginationParams:
    offset: int = 0
    limit: int = 50


PaginationParamsDep = Annotated[PaginationParams, Depends()]


async def get_user_principal(
    x_user_id: Annotated[Optional[str], Header()] = None,
    x_user_name: Annotated[Optional[str], Header()] = None,
    x_user_email: Annotated[Optional[str], Header()] = None,
) -> UserPrincipal:
    """
    Get user principal from headers (passed by C4 backend).
    
    This service is internal and trusts all requests.
    User context is optionally provided via headers for audit/tracking purposes.
    
    Headers:
        X-User-Id: User ID from C4
        X-User-Name: Username from C4
        X-User-Email: User email from C4
    """
    return UserPrincipal(
        id=x_user_id or "anonymous",
        name=x_user_name or "anonymous",
        email=x_user_email,
    )


UserPrincipalDep = Annotated[UserPrincipal, Depends(get_user_principal)]
