import os
import tempfile
import pymupdf

_ocr_reader = None


def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
        except ImportError as exc:
            raise RuntimeError(
                "easyocr is required only for scanned/image resumes. "
                "Install it with: pip install easyocr"
            ) from exc
        _ocr_reader = easyocr.Reader(["en"], gpu=False)
    return _ocr_reader


def ocr_image(image_path: str) -> str:
    results = _get_ocr_reader().readtext(
        image_path,
        detail=0,
        paragraph=True,
    )
    return "\n".join(results).strip()


def extract_pdf_text(pdf_path: str) -> str:
    document = pymupdf.open(pdf_path)
    try:
        return "\n".join(
            page.get_text().strip()
            for page in document
            if page.get_text().strip()
        ).strip()
    finally:
        document.close()


def ocr_pdf(pdf_path: str) -> str:
    document = pymupdf.open(pdf_path)
    pages_text = []

    try:
        for page_number, page in enumerate(document):
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
            with tempfile.NamedTemporaryFile(
                suffix=f"_resume_page_{page_number}.png",
                delete=False,
            ) as tmp:
                image_path = tmp.name

            try:
                pix.save(image_path)
                text = ocr_image(image_path)
                if text:
                    pages_text.append(text)
            finally:
                if os.path.exists(image_path):
                    os.remove(image_path)
    finally:
        document.close()

    return "\n".join(pages_text).strip()


def load_resume(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    extension = os.path.splitext(file_path)[1].lower()

    if extension in {".jpg", ".jpeg", ".png", ".webp"}:
        return ocr_image(file_path)

    if extension == ".pdf":
        text = extract_pdf_text(file_path)
        if text.strip():
            return text
        return ocr_pdf(file_path)

    raise ValueError(
        f"Unsupported file format: {extension}. "
        "Supported formats: PDF, PNG, JPG, JPEG, WEBP"
    )
