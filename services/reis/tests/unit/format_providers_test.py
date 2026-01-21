from itertools import combinations

from rei_s.config import Config
from rei_s.services.formats import get_format_providers
from rei_s.services.formats.code_provider import CodeProvider
from rei_s.services.formats.html_provider import HtmlProvider
from rei_s.services.formats.json_provider import JsonProvider
from rei_s.services.formats.libre_office_provider import LibreOfficeProvider
from rei_s.services.formats.markdown_provider import MarkdownProvider
from rei_s.services.formats.ms_excel_provider import MsExcelProvider
from rei_s.services.formats.ms_ppt_provider import MsPptProvider
from rei_s.services.formats.ms_word_provider import MsWordProvider
from rei_s.services.formats.outlook_provider import OutlookProvider
from rei_s.services.formats.pdf_provider import PdfProvider
from rei_s.services.formats.plain_provider import PlainProvider
from rei_s.services.formats.xml_provider import XmlProvider
from rei_s.services.formats.yaml_provider import YamlProvider
from rei_s.types.source_file import SourceFile, temp_file
from tests.conftest import get_test_config


def test_markdown_provider() -> None:
    expected = "# Birthdays\n\n## Dagobert Duck"
    source_file = SourceFile(
        path="tests/data/birthdays.md",
        mime_type="text/markdown",
        file_name="text.md",
    )

    md = MarkdownProvider()
    assert md.supports(source_file)
    docs = md.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content.startswith(expected)
    assert docs[0].metadata.get("url") == "http://example.com"
    assert docs[0].metadata.get("grandnephews") == '["Tick", "Trick", "Track"]'
    assert docs[0].metadata.get("author") == '{"first_name": "Carl", "last_name": "Barks", "birthday": "1901-03-27"}'

    pdf = md.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, "Dagobert Duck")
    assert pdf.id == source_file.id


def test_html_provider() -> None:
    content = b"<h1>Hello World!</h1>"
    expected = content.decode()
    with temp_file(buffer=content, mime_type="text/html", file_name="text.html") as source_file:
        html = HtmlProvider()
        assert html.supports(source_file)
        docs = html.process_file(source_file)
        assert len(docs) > 0
        assert docs[0].page_content == expected

        pdf = html.convert_file_to_pdf(source_file)
        assert_pdf_contains_text(pdf, expected)
        assert pdf.id == source_file.id


def test_odt_provider() -> None:
    expected = "Darkwing Duck was born on 9/17/1966."
    source_file = SourceFile(
        path="tests/data/birthdays.odt",
        mime_type="application/vnd.oasis.opendocument.text",
        file_name="text.odt",
    )

    odt = LibreOfficeProvider()
    assert odt.supports(source_file)
    docs = odt.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content == expected

    pdf = odt.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, expected)
    assert pdf.id == source_file.id


def test_xlsx_provider() -> None:
    expected_p1 = """Name
Mickey Mouse
Donald Duck

Birthday
3/14/1592
2/7/1828

BirthdaySheet

Page 1"""
    expected_p2 = """Name 1
Mickey Mouse

Name 2
Mini Mouse

Anniversary

01/01/11

AnniversarySheet

Page 2"""
    source_file = SourceFile(
        path="tests/data/birthdays.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        file_name="text.xlsx",
    )

    xlsx = MsExcelProvider()
    assert xlsx.supports(source_file)
    docs = xlsx.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content == expected_p1
    assert docs[0].metadata["page"] == 1
    assert docs[1].page_content == expected_p2
    assert docs[1].metadata["page"] == 2

    pdf = xlsx.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, expected_p1)
    assert_pdf_contains_text(pdf, expected_p2)
    assert pdf.id == source_file.id


def test_docx_provider() -> None:
    expected = "Darkwing Duck was born on 9/17/1966."
    source_file = SourceFile(
        path="tests/data/birthdays.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_name="text.docx",
    )

    docx = MsWordProvider()
    assert docx.supports(source_file)
    docs = docx.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content == expected

    pdf = docx.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, expected)
    assert pdf.id == source_file.id


def test_pptx_provider() -> None:
    expected = """Birthdays

Gladstone Gander: 5/14/2001"""
    source_file = SourceFile(
        path="tests/data/birthdays.pptx",
        mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        file_name="text.pptx",
    )

    pptx = MsPptProvider()
    assert pptx.supports(source_file)
    docs = pptx.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content == expected

    pdf = pptx.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, "Gladstone Gander")
    assert pdf.id == source_file.id


def test_pdf_provider() -> None:
    expected_p1 = """Name
Darkwing Duck
Daisy Duck

Birthday

03/14/1892
02/07/1228

BirthdaySheet

Page 1"""
    expected_p2 = """BirthdaySheet

Daniel Düsentrieb
Quack

02/07/2714
01/02/3456

Page 2"""
    source_file = SourceFile(path="tests/data/birthdays.pdf", mime_type="application/pdf", file_name="text.pdf")

    pdf = PdfProvider()
    assert pdf.supports(source_file)
    docs = pdf.process_file(source_file)
    assert len(docs) == 2
    assert docs[0].page_content == expected_p1
    assert docs[0].metadata["page"] == 1
    assert docs[1].page_content == expected_p2
    assert docs[1].metadata["page"] == 2

    converted_pdf_file = pdf.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(converted_pdf_file, expected_p1)
    assert converted_pdf_file.id == source_file.id


def test_code_provider() -> None:
    content = b'print("Hello World!)'
    expected = content.decode()
    with temp_file(buffer=content, mime_type="text/x-python", file_name="script.py") as source_file:
        code = CodeProvider()
        assert code.supports(source_file)
        docs = code.process_file(source_file)
        assert len(docs) > 0
        assert docs[0].page_content == expected

        pdf = code.convert_file_to_pdf(source_file)
        assert_pdf_contains_text(pdf, expected)
        assert pdf.id == source_file.id


def test_json_provider() -> None:
    source_file = SourceFile(path="tests/data/birthdays.json", mime_type="application/json", file_name="birthdays.json")
    expected = '{"additional_info": {"creator": "Walt Disney"}}'

    txt = JsonProvider(chunk_size=100)
    assert txt.supports(source_file)
    docs = txt.process_file(source_file)
    assert len(docs) > 0
    assert (
        docs[0].page_content
        == '{"ducks": [{"name": "Dagobert Duck", "birthdate": "1867-03-19"}, {"name": "Donald Duck", "birthdate": "1934-06-09"}]}'  # noqa: E501
    )
    assert docs[1].page_content == expected

    pdf = txt.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, "Dagobert Duck")
    assert pdf.id == source_file.id


def test_xml_provider() -> None:
    source_file = SourceFile(path="tests/data/birthdays.xml", mime_type="application/xml", file_name="birthdays.xml")
    expected_p1 = """<?xml version="1.0" encoding="UTF-8"?>
<ducks>
  <duck>
    <name>Dagobert Duck</name>
    <birthdate>1867-09-15</birthdate>"""
    expected_p2 = """</duck>
  <duck>
    <name>Donald Duck</name>
    <birthdate>1934-06-09</birthdate>
  </duck>
</ducks>"""

    txt = XmlProvider(chunk_size=150, chunk_overlap=0)
    assert txt.supports(source_file)
    docs = txt.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content == expected_p1
    assert docs[1].page_content == expected_p2

    pdf = txt.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, "<name>Dagobert Duck</name>")
    assert pdf.id == source_file.id


def test_yaml_provider() -> None:
    source_file = SourceFile(path="tests/data/birthdays.yaml", mime_type="application/yaml", file_name="birthdays.yaml")
    expected_p1 = """---
ducks:
  - name: Dagobert Duck
    birthdate: 1867-12-24
  - name: Donald Duck
    birthdate: 1934-08-17"""
    expected_p2 = """additional_info:
  creator: Walt Disney
  first_appearance:
    Scrooge: 1947
    Donald: 1934
  popular_media:
    - DuckTales
    - Comics
    - Animated shorts"""

    txt = YamlProvider(chunk_size=200, chunk_overlap=0)
    assert txt.supports(source_file)
    docs = txt.process_file(source_file)
    assert len(docs) > 0
    assert docs[0].page_content == expected_p1
    assert docs[1].page_content == expected_p2

    pdf = txt.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, "Dagobert Duck")
    assert pdf.id == source_file.id


def test_plain_provider() -> None:
    content = b"Hello World!"
    expected_p1 = "Hello"
    expected_p2 = "World!"
    with temp_file(buffer=content, mime_type="text/plain", file_name="text.txt") as source_file:
        txt = PlainProvider(10, 0)
        assert txt.supports(source_file)
        docs = txt.process_file(source_file)
        assert len(docs) > 0
        assert docs[0].page_content == expected_p1
        assert docs[1].page_content == expected_p2

        pdf = txt.convert_file_to_pdf(source_file)
        assert_pdf_contains_text(pdf, expected_p1)
        assert pdf.id == source_file.id


def test_outlook_provider() -> None:
    # file downloaded from https://docs.fileformat.com/email/msg/
    source_file = SourceFile(path="tests/data/email.msg", mime_type="application/vnd.ms-outlook", file_name="email.msg")
    expected = "This message is created by Aspose.Email"

    txt = OutlookProvider(chunk_size=200, chunk_overlap=0)

    assert txt.supports(source_file)
    docs = txt.process_file(source_file)

    assert len(docs) > 0
    assert docs[0].page_content == "This message is created by Aspose.Email"
    assert docs[0].metadata["subject"] == "creating an outlook message file"
    assert docs[0].metadata["sender"] == "from@domain.com"

    pdf = txt.convert_file_to_pdf(source_file)
    assert_pdf_contains_text(pdf, expected)
    assert pdf.id == source_file.id


# this function needs to be kept up-to-date with dummy-configurations
# of all formats which need to be activated via configurations
def get_config_all_formats_enabled() -> Config:
    return get_test_config(
        dict(
            stt_type="azure-openai-whisper",
            stt_azure_openai_whisper_endpoint="example.com",
            stt_azure_openai_whisper_api_key="secret",
            stt_azure_openai_whisper_api_version="-",
            stt_azure_openai_whisper_deployment_name="whisper",
        )
    )


def test_format_providers_unique() -> None:
    # ensure that there are no two providers which handle the same file
    config = get_config_all_formats_enabled()
    format_provider_instances = get_format_providers(config)

    extensions = [j for i in format_provider_instances for j in i.file_name_extensions]

    for i, j in combinations(format_provider_instances, 2):
        for extension in extensions:
            f_extension = SourceFile(path="", mime_type="", file_name=f"x.{extension}")
            assert not i.supports(f_extension) or not j.supports(f_extension)


def assert_pdf_contains_text(file: SourceFile, text: str) -> None:
    pdf = PdfProvider()
    docs = pdf.process_file(file, chunk_overlap=0)
    content = "\n".join(doc.page_content for doc in docs)
    assert text in content
