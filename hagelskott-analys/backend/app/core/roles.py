from enum import Enum
from typing import List

class UserRole(str, Enum):
    USER = "user"
    ELDER = "elder"
    ADMIN = "admin"

# Rättigheter för varje roll
ROLE_PERMISSIONS = {
    UserRole.USER: [
        "view_loads",
        "create_loads",
        "edit_own_loads",
        "delete_own_loads",
        "view_components",
        "create_analysis",
    ],
    UserRole.ELDER: [
        "view_loads",
        "create_loads",
        "edit_own_loads",
        "delete_own_loads",
        "view_components",
        "create_components",
        "edit_components",
        "create_analysis",
    ],
    UserRole.ADMIN: [
        "view_loads",
        "create_loads",
        "edit_any_loads",
        "delete_any_loads",
        "view_components",
        "create_components",
        "edit_components",
        "delete_components",
        "manage_users",
        "create_analysis",
        "delete_analysis",
    ]
}

def get_role_permissions(role: UserRole) -> List[str]:
    """Hämtar alla rättigheter för en given roll"""
    return ROLE_PERMISSIONS.get(role, [])

def has_permission(user_roles: List[str], required_permission: str) -> bool:
    """Kontrollerar om användaren har den nödvändiga rättigheten baserat på sina roller"""
    user_permissions = []
    for role in user_roles:
        try:
            role_enum = UserRole(role.lower())
            user_permissions.extend(get_role_permissions(role_enum))
        except ValueError:
            continue
    return required_permission in user_permissions 