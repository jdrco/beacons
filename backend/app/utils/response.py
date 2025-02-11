from fastapi.responses import JSONResponse

def success_response(
        status_codes,
        status,
        message,
        data=None,
        pagination=None):

    response_content = {
        "status": status,
        "message": message,
        "data": data or []
    }

    if pagination:
        response_content["pagination"] = pagination

    return JSONResponse(status_code=status_codes, content=response_content)

def error_response(status_codes: int, status: bool, message: str):
    return JSONResponse(
        status_code=status_codes,
        content={
            "status": status,
            "message": message,
        }
    )
