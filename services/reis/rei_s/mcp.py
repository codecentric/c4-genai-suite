from pydantic import Field
from fastmcp import FastMCP

from rei_s.config import get_config
from rei_s.routes.files import get_files
from rei_s.types.dtos import FileResult

mcp = FastMCP()


@mcp.tool()
async def get_data_all_files(
    query_or_keyword: str = Field(description="Relevant keywords or phrases from the input query."),
    bucket: str = Field(description="The identifier of the bucket to use."),
    bucket_index: str | None = Field(
        description="The index name of the bucket containing the files. "
        "Leave empty to use the default configured index name.",
        default=None,
    ),
    bucket_files: str | None = Field(
        description="A list of file numbers associated with the bucket. "
        "Comma separated if multiple files. Leave empty to access all files.",
        default=None,
    ),
    take: int | None = Field(description="The maximum number of results to return.", default=None),
) -> FileResult:
    """
    This function retrieves data from multiple files in a specified storage bucket based on a given search_query.
    It allows for limiting the number of results and optionally filtering the files to be processed.
    """

    return get_files(
        get_config(),
        query=query_or_keyword,
        take=5 if take is None else take,
        bucket=bucket,
        index_name=bucket_index,
        files=bucket_files,
    )


mcp_app = mcp.http_app(path="/mcp", transport="sse")
