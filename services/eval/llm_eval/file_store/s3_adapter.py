from threading import Lock

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException
from mypy_boto3_s3 import S3Client

from llm_eval.file_store.filestore_adapter import FileStoreAdapter

lock = Lock()


class S3FileStoreAdapter(FileStoreAdapter):
    """S3-based file store adapter for reading files from S3/MinIO."""

    client: S3Client
    bucket_name: str

    async def get(self, file_id: str) -> bytes:
        """Get file content from S3.

        Args:
            file_id: The S3 object key

        Returns:
            bytes: The file content

        Raises:
            HTTPException: 404 if file not found, or other S3 errors
        """
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=file_id)
            return response["Body"].read()
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise HTTPException(status_code=404, detail="File not found") from e
            raise

    async def exists(self, file_id: str) -> bool:
        """Check if file exists in S3.

        Args:
            file_id: The S3 object key

        Returns:
            bool: True if file exists, False otherwise
        """
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=file_id)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise

    @classmethod
    def create(
        cls,
        endpoint_url: str | None,
        access_key_id: str | None,
        secret_access_key: str,
        bucket_name: str,
        region_name: str | None = None,
    ) -> "S3FileStoreAdapter":
        """Create an S3 file store adapter.

        Args:
            endpoint_url: S3 endpoint URL (for MinIO or custom S3)
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            bucket_name: S3 bucket name
            region_name: AWS region name (optional)

        Returns:
            S3FileStoreAdapter: Configured adapter instance

        Raises:
            ValueError: If required parameters are missing
        """
        if not secret_access_key:
            raise ValueError("S3 secret access key is required")
        if not bucket_name:
            raise ValueError("S3 bucket name is required")

        s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region_name,
        )

        # Try to create bucket if it doesn't exist (safe for existing buckets)
        with lock:
            try:
                s3_client.create_bucket(Bucket=bucket_name)
            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                # Ignore if bucket already exists
                if error_code not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
                    # For other errors, just log and continue
                    # (bucket might exist but we don't have create permission)
                    pass

        instance = cls()
        instance.client = s3_client
        instance.bucket_name = bucket_name

        return instance
