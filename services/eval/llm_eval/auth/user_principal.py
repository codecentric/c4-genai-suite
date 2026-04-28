from pydantic.dataclasses import dataclass


@dataclass
class UserPrincipal:
    id: str
    name: str
    email: str | None
