from fastapi.responses import JSONResponse

def success_response(status_codes, status, message, data=None):
    """
    Standard success response.
    """
    return JSONResponse(
        status_code=status_codes,
        content={
            "status": status,
            "message": message,
            "data": data or {},
        }
    )

def error_response(status_codes: int, status: bool, message: str):
    """
    Standard error response.
    """
    return JSONResponse(
        status_code=status_codes,
        content={
            "status": status,
            "message": message,
        }
    )
