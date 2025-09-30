from typing import Any, List, Optional, Dict, Tuple
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class ChunkDto(BaseModel):
    uri: str = Field(description="Unique uri or id of the chunk.")
    content: str = Field(description="The content of the chunk.")
    pages: Optional[list[int]] = Field(description="The pages of the chunk inside the document.")
    score: float = Field(description="The score of the result.")
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DocumentDto(BaseModel):
    uri: str = Field(description="Unique uri or id of the document.")
    name: str = Field(description="The name of the document, e.g. the file name")
    mime_type: str = Field(description="The mime type of the document")
    link: Optional[str] = Field(description="A link to the source of the document")
    download_available: bool = Field(description="Indicates if the document is available")
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SourceDto(BaseModel):
    title: str = Field(description="The title of the source.")
    chunk: ChunkDto = Field(description="The chunk.")
    document: Optional[DocumentDto] = Field(description="The document.")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata about the source.")
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


SourceKey = Tuple[Optional[str], Optional[str], Optional[str], Optional[str], Optional[str]]


class ResultDocument(BaseModel):
    content: str = Field(description="the text content of the chunk")
    vector: list[float] | None = Field(description="the vector of the chunk", default=None)
    metadata: dict[str, Any] = Field(description="the metadata of the chunk")


class ResultPdf(BaseModel):
    content: bytes = Field(description="the buffer containing the pdf")
    metadata: dict[str, Any] = Field(description="the metadata of the chunk")


class FileType(BaseModel):
    file_name_extension: str = Field(description="The file name extension.")


class FileTypesResult(BaseModel):
    items: list[FileType] = Field(description="The files types.")


class FileResult(BaseModel):
    files: list[ResultDocument] = Field(description="The Chunks which were found for the given query")
    debug: str = Field(
        description="Through this filed you can return Markdown which will be rendered in the frontend. You can "
        " return sources through that"
    )
    sources: list[SourceDto] = Field(description="Additional information about the sources.")


class FileProcessResult(BaseModel):
    chunks: list[ResultDocument] = Field(description="The chunks which constitute the processed file")


class UploadRequest(BaseModel):
    bucket: str = Field(description="The bucket where the file belongs too")
    index_name: str = Field(description="The index name")
    id: str = Field(description="The ID of the file")


class DocumentResponse(BaseModel):
    documents: List[str]
