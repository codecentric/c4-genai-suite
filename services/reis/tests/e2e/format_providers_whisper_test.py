import os
import ffmpeg
from pydantic import ValidationError
import pytest
from langchain_core.documents import Document
from pytest_mock import MockerFixture
from faker import Faker

from rei_s.services.formats.utils import ProcessingError
from rei_s.services.formats.video_transcription_provider import VideoTranscriptionProvider
from rei_s.services.formats.voice_transcription_provider import VoiceTranscriptionProvider
from rei_s.types.source_file import SourceFile
from rei_s.config import Config
from tests.conftest import get_test_config

# Here we test the STT integration end to end by calling to a test deployment
# (needs ffmpeg available on the host system).

# Needed environment variables will be read from `.env.test` and the environment.
# If needed environment variables are missing, the test is skipped


def test_lfs_files_available() -> None:
    lfs_file = "tests/data/birthdays.mp3"
    file_size = os.path.getsize(lfs_file)
    assert file_size > 1000, (
        "Apparently git lfs is not configured. "
        "Please install it and do `git lfs pull` to fetch large files needed for this test."
    )


@pytest.fixture(scope="module", autouse=True)
def check_ffmpeg_available() -> None:
    try:
        ffmpeg.probe("tests/data/birthdays.mp3", loglevel="warning")
    except FileNotFoundError:
        pytest.skip("ffmpeg not available, skip all STT tests")


def get_mock_config() -> Config:
    return get_test_config(
        dict(
            stt_type="azure-openai-whisper",
            stt_azure_openai_whisper_endpoint="example.com",
            stt_azure_openai_whisper_deployment_name="whisper",
            stt_azure_openai_whisper_api_version="version",
            stt_azure_openai_whisper_api_key="secret",
        )
    )


def get_config_override() -> Config:
    try:
        return get_test_config(
            dict(
                stt_type="azure-openai-whisper",
            )
        )
    except ValidationError as e:
        pytest.skip(f"Skipped! A config value is missing: {e!r}")
        raise  # For type checker - pytest.skip raises but type checker doesn't know


@pytest.fixture
def mocked_whisper_answer(mocker: MockerFixture, faker: Faker) -> str:
    content = faker.text()
    docs = [Document(content)]
    mocker.patch("langchain_community.document_loaders.parsers.audio.AzureOpenAIWhisperParser.parse", return_value=docs)
    return content


@pytest.mark.parametrize(
    "filename",
    [
        "birthdays.mp3",
        "birthdays.m4a",
        "birthdays.ogg",
        "birthdays.flac",
        "birthdays.wav",
    ],
)
def test_audio_transcription_provider_mocked(mocked_whisper_answer: str, filename: str) -> None:
    source_file = SourceFile(path=f"tests/data/{filename}", mime_type="", file_name=filename)

    # the audio file is 16 s long. With a segment duration of 7 s we split it in 3 parts
    provider = VoiceTranscriptionProvider(
        config=get_mock_config(), chunk_size=200, chunk_overlap=0, default_segment_duration=7
    )

    assert provider.supports(source_file)
    docs = provider.process_file(source_file)

    assert len(docs) >= 2
    assert mocked_whisper_answer in docs[0].page_content
    assert mocked_whisper_answer in docs[1].page_content


def test_audio_transcription_provider_broken_file(mocked_whisper_answer: str) -> None:
    # we will give something which is not a media file to ffmpeg and wait the error
    source_file = SourceFile(path="tests/data/birthdays.pdf", mime_type="audio/mp3", file_name="birthdays.mp3")

    provider = VoiceTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)

    with pytest.raises(ProcessingError) as e:
        provider.process_file(source_file)
        assert e.value.message.startswith("Error handling audio file for voice transcription with ffmpeg")
        assert 400 <= e.value.status < 500


# Since Whisper has a rather low rate limit in requests per minute, this test might take a few minutes to finish
@pytest.mark.parametrize(
    "filename",
    [
        "birthdays.flac",
    ],
)
def test_audio_transcription_provider(filename: str) -> None:
    config = get_config_override()

    source_file = SourceFile(path=f"tests/data/{filename}", mime_type="", file_name=filename)

    provider = VoiceTranscriptionProvider(config=config, chunk_size=200, chunk_overlap=0, default_segment_duration=7)

    assert provider.supports(source_file)
    docs = provider.process_file(source_file)

    assert len(docs) > 0
    assert "Franz Gans hat am 27.12.1989 Geburtstag" in docs[0].page_content
    assert "hat am 12.12.1994 Geburtstag" in docs[1].page_content


@pytest.mark.parametrize(
    "filename",
    [
        # We will use an mp3/wav as a mock to extract the audio from instead of a real mp4.
        # FFmpeg handles the wrong file extension just fine and we can test all of our logic.
        "birthdays.mp3",
        "birthdays.wav",
    ],
)
def test_video_transcription_provider_mocked(mocked_whisper_answer: str, filename: str) -> None:
    source_file = SourceFile(path=f"tests/data/{filename}", mime_type="video/mp4", file_name="birthdays.mp4")

    provider = VideoTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)
    docs = provider.process_file(source_file)

    assert len(docs) > 0
    assert mocked_whisper_answer in docs[0].page_content


def test_video_transcription_provider_broken_file(mocked_whisper_answer: str) -> None:
    # we will give something which is not a media file to ffmpeg and wait the error

    source_file = SourceFile(path="tests/data/birthdays.pdf", mime_type="video/mp4", file_name="birthdays.mp4")

    provider = VideoTranscriptionProvider(config=get_mock_config(), chunk_size=200, chunk_overlap=0)

    assert provider.supports(source_file)

    with pytest.raises(ProcessingError) as e:
        provider.process_file(source_file)
        assert e.value.message.startswith(
            "Error extracting audio track from video file for voice transcription with ffmpeg"
        )
        assert 400 <= e.value.status < 500
