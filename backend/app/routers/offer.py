from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database import get_db
from app.models.application import Application
from app.models.offer import Offer
from app.models.user import User
from app.schemas.offer import (
    OfferCreate,
    OfferResponse,
    OfferStatusUpdate,
)
from app.services.notification_service import create_notification


router = APIRouter(
    prefix="/offers",
    tags=["Offers"],
)


ALLOWED_OFFER_STATUSES = {
    "DRAFT",
    "ISSUED",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
}


# ============================================================
# CREATE OFFER
# ============================================================

@router.post(
    "/",
    response_model=OfferResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_offer(
    data: OfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {
        "RECRUITER",
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create offers",
        )

    application = db.get(
        Application,
        data.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status not in {
        "SELECTED",
        "OFFERED",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Offer can be created only for a "
                "selected application"
            ),
        )

    existing_offer = db.scalar(
        select(Offer).where(
            Offer.application_id == data.application_id
        )
    )

    if existing_offer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "An offer already exists for this application"
            ),
        )

    offer = Offer(
        application_id=data.application_id,
        salary_package=data.salary_package,
        joining_date=data.joining_date,
        offer_letter_url=data.offer_letter_url,
        status="DRAFT",
        created_by=current_user.id,
    )

    db.add(offer)

    # Keep the existing application lifecycle sync.
    application.status = "OFFERED"

    db.commit()
    db.refresh(offer)

    return offer


# ============================================================
# GET ALL OFFERS
# ============================================================

@router.get(
    "/",
    response_model=list[OfferResponse],
)
def get_all_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view offers",
        )

    offers = db.scalars(
        select(Offer)
        .order_by(Offer.id.desc())
    ).all()

    return offers


# ============================================================
# GET MY OFFERS - STUDENT
# ============================================================

@router.get(
    "/my",
    response_model=list[OfferResponse],
)
def get_my_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("STUDENT")
    ),
):
    offers = db.scalars(
        select(Offer)
        .join(
            Application,
            Application.id == Offer.application_id,
        )
        .where(
            Application.student_id == current_user.id
        )
        .order_by(Offer.id.desc())
    ).all()

    return offers


# ============================================================
# GET ONE OFFER
# ============================================================

@router.get(
    "/{offer_id}",
    response_model=OfferResponse,
)
def get_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = db.get(
        Offer,
        offer_id,
    )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    # Students can only view their own offer.
    if current_user.role == "STUDENT":
        application = db.get(
            Application,
            offer.application_id,
        )

        if (
            not application
            or application.student_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have permission "
                    "to view this offer"
                ),
            )

    # Staff roles can view offers.
    elif current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have permission "
                "to view this offer"
            ),
        )

    return offer


# ============================================================
# UPDATE OFFER STATUS
# ============================================================

@router.patch(
    "/{offer_id}/status",
    response_model=OfferResponse,
)
def update_offer_status(
    offer_id: int,
    data: OfferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = db.get(
        Offer,
        offer_id,
    )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    if data.status not in ALLOWED_OFFER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid offer status",
        )

    application = db.get(
        Application,
        offer.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    previous_status = offer.status

    # Student permissions.
    if current_user.role == "STUDENT":
        if application.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have permission "
                    "to update this offer"
                ),
            )

        if data.status not in {
            "ACCEPTED",
            "REJECTED",
        }:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Students can only accept "
                    "or reject an offer"
                ),
            )

    # Staff permissions.
    elif current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have permission "
                "to update this offer"
            ),
        )

    offer.status = data.status

    # Keep application status synchronized with the offer response.
    if data.status == "ACCEPTED":
        application.status = "ACCEPTED"
    elif data.status == "REJECTED":
        application.status = "REJECTED"

    # Notify the student when an offer is issued.
    if (
        data.status == "ISSUED"
        and previous_status != "ISSUED"
    ):
        create_notification(
            db=db,
            user_id=application.student_id,
            title="New Offer Issued",
            message=(
                "A new placement offer has been issued "
                "for your application. Please review "
                "the offer details."
            ),
            notification_type="OFFER",
        )

    # Notify the offer creator when the student accepts or rejects it.
    if (
        current_user.role == "STUDENT"
        and data.status in {
            "ACCEPTED",
            "REJECTED",
        }
        and previous_status != data.status
    ):
        student = db.get(
            User,
            application.student_id,
        )

        student_name = (
            student.full_name
            if student
            else f"Student #{application.student_id}"
        )

        if data.status == "ACCEPTED":
            title = "Offer Accepted"
            message = (
                f"{student_name} has accepted "
                f"offer #{offer.id}."
            )
        else:
            title = "Offer Rejected"
            message = (
                f"{student_name} has rejected "
                f"offer #{offer.id}."
            )

        create_notification(
            db=db,
            user_id=offer.created_by,
            title=title,
            message=message,
            notification_type="OFFER_RESPONSE",
        )

    # Commit status, lifecycle sync, and notifications together.
    db.commit()
    db.refresh(offer)

    return offer
