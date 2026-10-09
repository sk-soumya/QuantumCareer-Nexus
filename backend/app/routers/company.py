from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse


router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


@router.post(
    "/",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company(
    data: CompanyCreate,
    current_user: User = Depends(
        require_role("RECRUITER")
    ),
    db: Session = Depends(get_db),
):
    existing_company = db.scalar(
        select(Company).where(
            Company.name == data.name
        )
    )

    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company already exists",
        )

    company = Company(
        name=data.name,
        industry=data.industry,
        website=data.website,
        location=data.location,
        description=data.description,
    )

    db.add(company)
    db.commit()
    db.refresh(company)

    return company


@router.get(
    "/",
    response_model=list[CompanyResponse],
)
def list_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    companies = db.scalars(
        select(Company).order_by(Company.name)
    ).all()

    return companies


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
)
def get_company(
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.get(Company, company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company