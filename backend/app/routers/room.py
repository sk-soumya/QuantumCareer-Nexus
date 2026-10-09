from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.room import Room
from app.models.user import User
from app.schemas.room import RoomCreate, RoomResponse


router = APIRouter(
    prefix="/rooms",
    tags=["Rooms"],
)


# ============================================================
# CREATE ROOM
# ============================================================

@router.post(
    "/",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_room(
    data: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only placement officers and admins can create rooms",
        )

    if data.capacity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room capacity must be at least 1",
        )

    existing_room = db.scalar(
        select(Room).where(
            Room.name == data.name
        )
    )

    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room already exists",
        )

    room = Room(
        name=data.name,
        location=data.location,
        capacity=data.capacity,
        is_active=True,
    )

    db.add(room)
    db.commit()
    db.refresh(room)

    return room


# ============================================================
# LIST ROOMS
# ============================================================

@router.get(
    "/",
    response_model=list[RoomResponse],
)
def list_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rooms = db.scalars(
        select(Room).order_by(Room.name)
    ).all()

    return rooms


# ============================================================
# GET ONE ROOM
# ============================================================

@router.get(
    "/{room_id}",
    response_model=RoomResponse,
)
def get_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = db.get(
        Room,
        room_id,
    )

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    return room