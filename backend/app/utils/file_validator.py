from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

ALLOWED_EXTENSIONS = {
    ".exe", ".dll", ".pdf", ".js",
    ".zip", ".msi", ".bat", ".ps1",
    ".vbs", ".doc", ".docx",
}


def validate_file(file: UploadFile, file_bytes: bytes) -> None:
    """
    Validate an uploaded file for malware scanning.
    Raises HTTPException 400 for invalid extension.
    Raises HTTPException 413 for oversized files.
    """
    import os
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type '{ext}' is not allowed. "
                f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB.",
        )
