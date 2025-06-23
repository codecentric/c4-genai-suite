import httpx
from mcp.server.fastmcp import FastMCP
from typing import Any, Dict
from pydantic import Field

mcp = FastMCP(host="0.0.0.0", port="3202")
base_url = "http://localhost:3201"


@mcp.tool()
async def get_data_all_files(
    query_or_keyword: str = Field(description="Relevant keywords or phrases from the input query."),
    take: int = Field(description="The maximum number of results to return.", default=5),
    bucket_index: str = Field(description="The index of the bucket containing the files."),
    bucket_path: str = Field(description="The path inside the bucket."),
    bucket_files: str = Field(
        description="""A list of file numbers associated with the bucket.
        Comma separated if multiple files.""",
        default="",
    ),
) -> Any:
    """
    This function retrieves data from multiple files in a specified storage bucket based on a given search_query.
    It allows for limiting the number of results and optionally filtering the files to be processed.
    """
    url = base_url + "/files"

    params: Dict[str, str] = {
        "query": str(query_or_keyword),
        "bucket": str(bucket_path),
        "take": str(take),
        "indexName": str(bucket_index),
    }

    if bucket_files is not None and len(bucket_files) > 0:
        params["files"] = bucket_files

    response = httpx.get(url, params=params)
    response.raise_for_status()
    return response.json()


mcp.run(transport="sse")
