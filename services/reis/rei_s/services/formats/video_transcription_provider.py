from pathlib import Path
from typing import Any
from langchain_core.documents import Document
import ffmpeg

from rei_s import logger
from rei_s.config import Config
from rei_s.services.formats.utils import ProcessingError
from rei_s.services.formats.voice_transcription_provider import VoiceTranscriptionProvider
from rei_s.types.source_file import SourceFile


class VideoTranscriptionProvider(VoiceTranscriptionProvider):
    name = "video-transcription"

    file_name_extensions = [
        ".mp4",
        ".mpeg",
        ".mpg",
        ".mpe",
        ".ogv",
        ".mov",
        ".webm",
        ".avi",
        ".3gp",
        ".flv",
        ".mkv",
        ".wmv",
    ]

    def __init__(
        self, config: Config | None = None, chunk_size: int = 1000, chunk_overlap: int = 200, **kwargs: Any
    ) -> None:
        super().__init__(config=config, chunk_size=chunk_size, chunk_overlap=chunk_overlap, **kwargs)

    @staticmethod
    def build_ffmpeg_error_message(e: ffmpeg.Error) -> str:
        return (
            "Error extracting audio track from video file for voice transcription with ffmpeg\n\n"
            f"ffmpeg stderr:\n{e.stderr}"
        )

    def extract_audio_to_file(self, input_video_path: str | Path, output_bitrate: str = "128k") -> SourceFile:
        metadata = self.probe_audio_codec(input_video_path)
        audio_codec = metadata.audio_codec

        if audio_codec in self.supported_audio_codecs:
            logger.info(f"extract audiotrack ({audio_codec}) from video")
            output_kwargs = {"acodec": "copy"}
        else:
            logger.info(f"transcode audiotrack ({audio_codec}) to ogg")
            output_kwargs = {"audio_bitrate": output_bitrate}
            audio_codec = "vorbis"

        audio_only_file = SourceFile.new_temporary_file(extension=self.audio_codecs_to_file_extension[audio_codec])
        try:
            _out, _err = (
                ffmpeg.input(input_video_path)
                .output(audio_only_file.path, y=None, vn=None, **output_kwargs)
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:  # pragma: no cover
            message = self.build_ffmpeg_error_message(e)
            logger.error(message)
            raise ProcessingError(message, 400) from e

        return audio_only_file

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        audio_file = self.extract_audio_to_file(file.path)
        chunks = super().process_file(audio_file, chunk_size, chunk_overlap)
        audio_file.delete()
        return chunks
