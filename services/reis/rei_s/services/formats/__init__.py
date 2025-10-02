from functools import lru_cache
from typing import Any

from rei_s.config import Config
from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider

# here we need to import all format_providers
from rei_s.services.formats import pdf_provider as pdf_provider
from rei_s.services.formats import markdown_provider as markdown_provider
from rei_s.services.formats import html_provider as html_provider
from rei_s.services.formats import code_provider as code_provider
from rei_s.services.formats import json_provider as json_provider
from rei_s.services.formats import xml_provider as xml_provider
from rei_s.services.formats import yaml_provider as yaml_provider
from rei_s.services.formats import plain_provider as plain_provider
from rei_s.services.formats import libre_office_provider as libre_office_provider
from rei_s.services.formats import ms_excel_provider as ms_excel_provider
from rei_s.services.formats import ms_word_provider as ms_word_provider
from rei_s.services.formats import ms_ppt_provider as ms_ppt_provider
from rei_s.services.formats import outlook_provider as outlook_provider
from rei_s.services.formats import video_transcription_provider as video_transcription_provider
from rei_s.services.formats import voice_transcription_provider as voice_transcription_provider


def get_all_subclasses(cls: Any) -> set[type[Any]]:
    subclasses = set(cls.__subclasses__())
    for subclass in cls.__subclasses__():
        subclasses.update(get_all_subclasses(subclass))
    return subclasses


@lru_cache
def get_format_providers(config: Config) -> list[AbstractFormatProvider]:
    return [cls(config=config) for cls in get_all_subclasses(AbstractFormatProvider) if cls(config=config).enabled]


@lru_cache
def get_format_provider_mappings(config: Config) -> dict[str, AbstractFormatProvider]:
    return {format_.name: format_ for format_ in get_format_providers(config)}
