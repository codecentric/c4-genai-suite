from abc import ABC, abstractmethod


class FileStoreAdapter(ABC):
    """Abstract base class for file store adapters."""

    @abstractmethod
    async def get(self, file_id: str) -> bytes:
        """Get file content by ID.

        Args:
            file_id: The unique identifier of the file

        Returns:
            bytes: The file content

        Raises:
            HTTPException: If file not found (404) or other error
        """
        raise NotImplementedError

    @abstractmethod
    async def exists(self, file_id: str) -> bool:
        """Check if a file exists.

        Args:
            file_id: The unique identifier of the file

        Returns:
            bool: True if file exists, False otherwise
        """
        raise NotImplementedError
