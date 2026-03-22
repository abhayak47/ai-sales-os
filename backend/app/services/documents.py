from io import BytesIO
from zipfile import ZipFile
import re


def extract_text_from_upload(filename: str, content: bytes) -> str:
    name = (filename or "").lower()

    if name.endswith((".txt", ".md", ".csv", ".log")):
        return content.decode("utf-8", errors="ignore")

    if name.endswith(".docx"):
        with ZipFile(BytesIO(content)) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
        text = re.sub(r"<[^>]+>", " ", xml)
        return re.sub(r"\s+", " ", text).strip()

    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader  # type: ignore
        except Exception as exc:
            raise ValueError("PDF upload needs pypdf installed in the backend environment.") from exc

        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(page.strip() for page in pages if page.strip())

    raise ValueError("Unsupported file type. Please upload txt, md, csv, docx, or pdf.")
