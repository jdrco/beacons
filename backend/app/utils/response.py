from fastapi.responses import JSONResponse

def success_response(status_codes: int, status: bool, message: str, data: dict):
    return JSONResponse(
        status_code=status_codes,
        content={
            "status": status,
            "message": message,
            "data": data
        }
    )

def error_response(status_codes: int, status: bool, message: str):
    return JSONResponse(
        status_code=status_codes,
        content={
            "status": status,
            "message": message,
        }
    )