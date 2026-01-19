from fastapi import HTTPException, status

from llm_eval.schemas import GenericError

not_found_response = {404: {"model": GenericError}}


def not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def entity_outdated() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail="Entity outdated."
    )


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def unauthorized() -> HTTPException:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect user credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def invalid_user_id() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID."
    )
