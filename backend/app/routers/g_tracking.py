from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ok
from app.services.g_tracking_service import get_tracking_data

router = APIRouter(prefix="/api/v1/g-tracking", tags=["g-tracking"])


@router.get("/data")
def tracking_data(_: User = Depends(get_current_user)):
    data = get_tracking_data()
    return ok(data)
