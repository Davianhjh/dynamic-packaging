"""auth 业务：认证与首次管理员播种。"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import User, UserRole
from app.auth.security import hash_password, verify_password
from app.config import settings


def get_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = get_by_username(db, username)
    if user is not None and verify_password(password, user.password_hash):
        return user
    return None


def seed_admin(db: Session) -> None:
    """库中无任何用户时，按配置创建初始管理员。"""
    if db.scalar(select(User.id).limit(1)) is not None:
        return
    db.add(
        User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role=UserRole.ADMIN,
        )
    )
    db.commit()
