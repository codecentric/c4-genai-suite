from threading import Lock

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException
from mypy_boto3_s3 import S3Client

from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.types.source_file import SourceFile


lock = Lock()


class S3FileStoreAdapter(FileStoreAdapter):
    client: S3Client
    bucket_name: str

    def add_document(self, document: SourceFile) -> None:
        with open(document.path, "rb") as f:
            self.client.upload_fileobj(f, self.bucket_name, document.id)

    def delete(self, doc_id: str) -> None:
        if not self.exists(doc_id):
            raise HTTPException(status_code=404, detail="File not found")

        self.client.delete_object(Bucket=self.bucket_name, Key=doc_id)

    def get_document(self, doc_id: str) -> SourceFile:
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=doc_id)
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise HTTPException(status_code=404, detail="File not found") from e
            raise
        return SourceFile.new_temporary_file(response["Body"].read())

    def exists(self, doc_id: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=doc_id)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise
        else:
            return True

    @classmethod
    def create(cls, config: Config) -> "S3FileStoreAdapter":
        if config.file_store_s3_bucket_name is None:
            raise ValueError("The env variable `FILE_STORE_S3_BUCKET_NAME` is missing.")

        s3_client = boto3.client(
            "s3",
            endpoint_url=config.file_store_s3_endpoint_url,
            aws_access_key_id=config.file_store_s3_access_key_id,
            aws_secret_access_key=config.file_store_s3_secret_access_key,
            region_name=config.file_store_s3_region_name,
        )

        with lock:
            try:
                s3_client.create_bucket(Bucket=config.file_store_s3_bucket_name)
            except ClientError as e:
                if e.response["Error"]["Code"] == "BucketAlreadyOwnedByYou":
                    pass

        instance = cls()

        instance.client = s3_client
        instance.bucket_name = config.file_store_s3_bucket_name

        return instance
